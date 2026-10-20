// Use-case orchestration of UC-VID-001 - "Recortar um Intervalo Temporal de
// um Vídeo" - built as a generic processing queue for video tools
// (REQ-VID-TRIM-060): each tool (tools/trimTool.js) only knows how to validate
// its parameters and build the FFmpeg arguments; queueing, states, progress,
// retries, cancellation, quota and storage live here.
//
//   checkEligibility -> step 2 (E1 defensive, E4)
//   create           -> steps 6-8 (E2, E3, E4, E7, quota reserved, "queued")
//   worker           -> steps 9-11 ("processing", progress, retry, result in
//                       the library, "completed" / "failed")
//   cancel           -> FA2
//   list / get / markSeen -> step 10, 12, FA3

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const { AppError } = require("../utils/errors");
const { VIDEO_STATUS, JOB_STATUS, ACTIVE_JOB_STATUSES } = require("../utils/status");
const { PROCESSING, activeLimitFor: defaultActiveLimitFor } = require("../config/processing");
const defaultLimitsFor = require("../config/limits").limitsFor;
const { validateProbe } = require("./videoValidator");
const { toPublic, storedContentType, OCCUPYING_STATUSES } = require("./videoLibraryService");
const ffmpegAdapter = require("./tools/ffmpegAdapter");
const { trimTool } = require("./tools/trimTool");

const NON_RETRYABLE = new Set(["insufficient_storage", "source_unavailable"]);

class JobError extends Error {
  constructor(code, details) {
    super(code);
    this.code = code;
    this.details = details || {};
  }
}

class ProcessingService {
  constructor({
    videoRepository,
    jobRepository,
    objectStorage,
    mediaProbe,
    userProfiles,
    quota,
    tmpDir,
    tools = { trim: trimTool },
    ffmpeg = ffmpegAdapter,
    limitsFor = defaultLimitsFor,
    activeLimitFor = defaultActiveLimitFor,
    config = PROCESSING,
    now = () => Date.now(),
    logger = console,
  }) {
    Object.assign(this, {
      videos: videoRepository,
      jobs: jobRepository,
      storage: objectStorage,
      probe: mediaProbe,
      profiles: userProfiles,
      quota,
      tmpDir,
      tools,
      ffmpeg,
      limitsFor,
      activeLimitFor,
      config,
      now,
      log: logger,
    });
    this.running = new Map(); // jobId -> { cancel(), cancelled }
    this.userLocks = new Map();
    this.pumping = Promise.resolve();
    this.stopped = false;
  }

  // ---------------------------------------------------------------- access

  async resolveProfile(userId) {
    const type = await this.profiles.getUserType(userId);
    const maxActive = this.activeLimitFor(type);
    if (!maxActive) {
      // UC-VID-002 RN1: no video features for anonymous users
      throw new AppError(403, "anonymous_not_allowed", "Video tools require a registered account.");
    }
    return { type, maxActive, limits: this.limitsFor(type) };
  }

  /** REQ-VID-TRIM-059 / REQ-VID-LIB-033: only the owner's videos. */
  async getSourceVideo(userId, videoId) {
    const video = await this.videos.findById(videoId);
    if (!video) throw new AppError(404, "video_not_found", "Video not found.");
    if (video.userId !== userId) throw new AppError(403, "forbidden", "You do not have permission to access this video.");
    if (video.status !== VIDEO_STATUS.AVAILABLE) {
      throw new AppError(409, "video_not_available", "Only available videos can be processed.", { status: video.status });
    }
    // E1 / REQ-VID-TRIM-036 (defensive in the MVP): MP4/MOV with H.264 only
    if (!["mp4", "mov"].includes(video.format) || (video.videoCodec && video.videoCodec !== "h264")) {
      throw new AppError(422, "unsupported_for_processing", "This video format is not supported for trimming.", {
        accepted: ["MP4", "MOV"],
      });
    }
    return video;
  }

  async getOwnJob(userId, jobId) {
    const job = await this.jobs.findById(jobId);
    if (!job) throw new AppError(404, "job_not_found", "Request not found.");
    if (job.userId !== userId) throw new AppError(403, "forbidden", "You do not have permission to access this request.");
    return job;
  }

  /** E4 / RN4 / REQ-VID-TRIM-043: 1 active request (Registered), 3 (Premium). */
  async assertBelowActiveLimit(userId, maxActive) {
    const active = await this.jobs.listActiveByUser(userId);
    if (active.length >= maxActive) {
      throw new AppError(409, "processing_in_progress", "There is already a trim in progress. Please wait for it to finish.", {
        limit: maxActive,
      });
    }
    return active;
  }

  // ------------------------------------------------------------------ step 2

  /** Step 2: can the user open the trim screen for this video? */
  async checkEligibility(userId, videoId, type = "trim") {
    this.toolOf(type);
    const { maxActive } = await this.resolveProfile(userId);
    const video = await this.getSourceVideo(userId, videoId);
    await this.assertBelowActiveLimit(userId, maxActive);
    return { ok: true, video: toPublic(video) };
  }

  toolOf(type) {
    const tool = this.tools[type];
    if (!tool) throw new AppError(400, "unknown_tool", `Unknown video tool "${type}".`);
    return tool;
  }

  // -------------------------------------------------------------- steps 6-8

  /**
   * REQ-VID-TRIM-012, 013, 014, 042, 043, 057, 062.
   * Order of the use case: interval (E2), active limit (E4), space (E7),
   * quota reservation (E3), request registered "queued".
   */
  async create(userId, videoId, type, request) {
    const tool = this.toolOf(type);
    const { maxActive, limits } = await this.resolveProfile(userId);

    return this.withUserLock(userId, async () => {
      const video = await this.getSourceVideo(userId, videoId);
      const params = tool.prepare(video, request); // E2, FA1
      const active = await this.assertBelowActiveLimit(userId, maxActive); // E4

      // E7 / REQ-VID-TRIM-062: estimated result must fit in the library
      const estimatedBytes = tool.estimateBytes(video, params);
      const occupied =
        (await this.videos.sumSize(userId, OCCUPYING_STATUSES)) +
        active.reduce((acc, j) => acc + (j.estimatedBytes || 0), 0);
      const freeBytes = Math.max(0, limits.storageBytes - occupied);
      if (estimatedBytes > freeBytes) {
        throw new AppError(507, "insufficient_storage_for_result", "There is not enough space in your library for the trimmed video.", {
          estimatedBytes,
          freeBytes,
          limitBytes: limits.storageBytes,
        });
      }

      await this.quota.reserve(userId); // E3 / RN3 - throws when exhausted

      let job;
      try {
        job = await this.jobs.create({
          userId,
          sourceVideoId: String(video._id),
          sourceName: video.name,
          type,
          params,
          status: JOB_STATUS.QUEUED, // REQ-VID-TRIM-014
          progress: 0,
          attempts: 0,
          estimatedBytes,
          seen: false,
        });
      } catch (err) {
        await this.quota.refund(userId);
        throw err;
      }

      this.pump();
      return toPublicJob(job);
    });
  }

  // ---------------------------------------------------------- step 10 / FA3

  async list(userId) {
    await this.resolveProfile(userId);
    return (await this.jobs.listByUser(userId, 20)).map(toPublicJob);
  }

  async get(userId, jobId) {
    await this.resolveProfile(userId);
    return toPublicJob(await this.getOwnJob(userId, jobId));
  }

  /** REQ-VID-TRIM-023/035: the in-app notification of a final state was shown. */
  async markSeen(userId, jobId) {
    const job = await this.getOwnJob(userId, jobId);
    if (!ACTIVE_JOB_STATUSES.includes(job.status)) await this.jobs.update(jobId, { seen: true });
  }

  // --------------------------------------------------------------------- FA2

  /** FA2 / REQ-VID-TRIM-028..033: only "queued" or "processing". */
  async cancel(userId, jobId) {
    await this.resolveProfile(userId);
    const job = await this.getOwnJob(userId, jobId);
    if (!ACTIVE_JOB_STATUSES.includes(job.status)) {
      throw new AppError(409, "cannot_cancel_request", "This request has already finished.", { status: job.status });
    }

    // State first, so the worker never overwrites it afterwards.
    await this.jobs.update(jobId, {
      status: JOB_STATUS.CANCELLED,
      finishedAt: new Date(this.now()),
      seen: true, // the user cancelled it: no notification needed
    });
    const handle = this.running.get(String(jobId));
    if (handle) {
      handle.cancelled = true;
      handle.cancel(); // REQ-VID-TRIM-031: stops FFmpeg; the worker removes partial files
    }
    await this.quota.refund(userId); // REQ-VID-TRIM-032
    return toPublicJob(await this.jobs.findById(jobId));
  }

  // ------------------------------------------------------------------ worker

  /** Starts queued requests while there is capacity (REQ-VID-TRIM-058). */
  pump() {
    this.pumping = this.pumping
      .then(async () => {
        while (!this.stopped && this.running.size < this.config.concurrency) {
          const next = await this.jobs.nextQueued([...this.running.keys()]);
          if (!next) break;
          const handle = { cancelled: false, cancel: () => {} };
          this.running.set(String(next._id), handle);
          this.runJob(next, handle)
            .catch((err) => this.log.error("[videos] job crashed", next._id, err))
            .finally(() => {
              this.running.delete(String(next._id));
              this.pump();
            });
        }
      })
      .catch((err) => this.log.error("[videos] queue error", err));
    return this.pumping;
  }

  /** Resolves when no request is running or queued (used by tests). */
  async idle() {
    for (;;) {
      await this.pumping;
      if (this.running.size === 0) {
        const next = await this.jobs.nextQueued([]);
        if (!next) return;
      }
      await new Promise((r) => setTimeout(r, 20));
    }
  }

  async runJob(job, handle) {
    const jobId = String(job._id);
    const fresh = await this.jobs.findById(jobId);
    if (!fresh || fresh.status !== JOB_STATUS.QUEUED) return;

    // Step 9: "processing" (REQ-VID-TRIM-016)
    let attempts = fresh.attempts || 0;
    await this.jobs.update(jobId, { status: JOB_STATUS.PROCESSING, startedAt: new Date(this.now()), progress: 0 });

    let lastError;
    while (attempts < this.config.maxAttempts) {
      attempts += 1;
      await this.jobs.update(jobId, { attempts, progress: 0 });
      try {
        await this.execute(fresh, handle);
        return;
      } catch (err) {
        if (handle.cancelled) {
          // FA2: cancel() already set the final state and refunded; make sure
          // a concurrent "processing" update did not overwrite it.
          await this.jobs.update(jobId, { status: JOB_STATUS.CANCELLED });
          return;
        }
        lastError = err;
        this.log.error(`[videos] job ${jobId} attempt ${attempts} failed`, err.message);
        if (err instanceof JobError && NON_RETRYABLE.has(err.code)) break;
        // RN7 / REQ-VID-TRIM-044: one automatic retry
      }
    }

    // E5 / REQ-VID-TRIM-045, 046, 047 (and E7 / REQ-VID-TRIM-063)
    const code = lastError instanceof JobError ? lastError.code : "processing_failed";
    await this.jobs.update(jobId, {
      status: JOB_STATUS.FAILED,
      error: { code, details: lastError?.details || {} },
      finishedAt: new Date(this.now()),
    });
    await this.quota.refund(fresh.userId);
  }

  /** One attempt: FFmpeg -> validate result -> space check -> library. */
  async execute(job, handle) {
    const jobId = String(job._id);
    const tool = this.toolOf(job.type);
    const output = path.join(this.tmpDir, `${jobId}.result.${job.params.outputFormat}`);

    const source = await this.videos.findById(job.sourceVideoId);
    if (!source || source.status !== VIDEO_STATUS.AVAILABLE) throw new JobError("source_unavailable");

    try {
      await fsp.mkdir(this.tmpDir, { recursive: true });
      await fsp.rm(output, { force: true });
      const input = await this.storage.internalUrl(job.userId, source.storageKey);

      // Steps 9-10: progress written at most once per second (RN8: <= 5 s)
      let lastWrite = 0;
      const run = this.ffmpeg.run(tool.buildArgs({ input, output, params: job.params }), {
        durationSec: tool.expectedDurationSec(job.params),
        onProgress: (percent) => {
          const t = this.now();
          if (t - lastWrite < this.config.progressWriteMs) return;
          lastWrite = t;
          this.jobs.update(jobId, { progress: percent }).catch(() => {});
        },
      });
      handle.cancel = run.cancel;
      if (handle.cancelled) run.cancel();
      await run.promise;
      if (handle.cancelled) throw new JobError("cancelled");

      // The result must be a valid video of the library (UC-VID-002 rules)
      const { limits } = await this.resolveProfile(job.userId);
      const checked = validateProbe(await this.probe.probe(output), limits);
      if (!checked.ok) throw new JobError("invalid_result", checked.rejection);
      const sizeBytes = (await fsp.stat(output)).size;

      // E7 / REQ-VID-TRIM-063: the real file must fit in the library
      const others = (await this.jobs.listActiveByUser(job.userId)).filter((j) => String(j._id) !== jobId);
      const occupied =
        (await this.videos.sumSize(job.userId, OCCUPYING_STATUSES)) +
        others.reduce((acc, j) => acc + (j.estimatedBytes || 0), 0);
      if (occupied + sizeBytes > limits.storageBytes) {
        throw new JobError("insufficient_storage", {
          sizeBytes,
          freeBytes: Math.max(0, limits.storageBytes - occupied),
          limitBytes: limits.storageBytes,
        });
      }
      if (handle.cancelled) throw new JobError("cancelled");

      // Step 11 / REQ-VID-TRIM-020: new, independent video of the library
      const storageKey = `videos/result-${jobId}.${job.params.outputFormat}`;
      await this.storage.put(job.userId, storageKey, output, storedContentType(job.params.outputFormat));
      const video = await this.videos.create({
        userId: job.userId,
        name: job.params.name,
        format: job.params.outputFormat,
        mimeType: job.params.outputFormat === "mov" ? "video/quicktime" : "video/mp4",
        sizeBytes,
        status: VIDEO_STATUS.AVAILABLE,
        storageKey,
        availableAt: new Date(this.now()),
        ...checked.metadata,
      });

      // A cancel that arrived during the upload wins: undo the result.
      const latest = await this.jobs.findById(jobId);
      if (handle.cancelled || latest?.status === JOB_STATUS.CANCELLED) {
        await this.storage.remove(job.userId, storageKey).catch(() => {});
        await this.videos.delete(video._id);
        throw new JobError("cancelled");
      }

      // REQ-VID-TRIM-021/022: completed; the reserved operation stays consumed
      await this.jobs.update(jobId, {
        status: JOB_STATUS.COMPLETED,
        progress: 100,
        resultVideoId: String(video._id),
        finishedAt: new Date(this.now()),
      });
    } finally {
      // REQ-VID-TRIM-056: no partial result left behind
      await fsp.rm(output, { force: true }).catch(() => {});
    }
  }

  // ------------------------------------------------------------- lifecycle

  /**
   * After a restart nothing is running: requests left "processing" go back
   * to the queue (the interrupted run counts as an attempt - RN7).
   */
  async recover() {
    for (const job of await this.jobs.findByStatus(JOB_STATUS.PROCESSING)) {
      if ((job.attempts || 0) >= this.config.maxAttempts) {
        await this.jobs.update(job._id, {
          status: JOB_STATUS.FAILED,
          error: { code: "processing_failed", details: {} },
          finishedAt: new Date(this.now()),
        });
        await this.quota.refund(job.userId);
      } else {
        await this.jobs.update(job._id, { status: JOB_STATUS.QUEUED, progress: 0 });
      }
    }
    // stale partial results
    await fsp.mkdir(this.tmpDir, { recursive: true });
    for (const f of await fsp.readdir(this.tmpDir)) {
      if (f.includes(".result.")) await fsp.rm(path.join(this.tmpDir, f), { force: true }).catch(() => {});
    }
    return this.pump();
  }

  /** Account deletion (UC-VID-002 RN13): stop the user's running requests. */
  async cancelAllForUser(userId) {
    for (const job of await this.jobs.listActiveByUser(userId)) {
      await this.jobs.update(job._id, { status: JOB_STATUS.CANCELLED, finishedAt: new Date(this.now()) });
      const handle = this.running.get(String(job._id));
      if (handle) {
        handle.cancelled = true;
        handle.cancel();
      }
    }
  }

  async withUserLock(userId, fn) {
    const previous = this.userLocks.get(userId) || Promise.resolve();
    const run = previous.catch(() => {}).then(fn);
    const tail = run.catch(() => {});
    this.userLocks.set(userId, tail);
    try {
      return await run;
    } finally {
      if (this.userLocks.get(userId) === tail) this.userLocks.delete(userId);
    }
  }
}

function toPublicJob(job) {
  return {
    _id: String(job._id),
    type: job.type,
    status: job.status,
    progress: job.progress ?? 0,
    sourceVideoId: job.sourceVideoId,
    sourceName: job.sourceName ?? null,
    params: job.params,
    attempts: job.attempts ?? 0,
    error: job.status === JOB_STATUS.FAILED ? job.error ?? null : null,
    resultVideoId: job.resultVideoId ?? null,
    seen: !!job.seen,
    createdAt: job.createdAt ?? null,
    startedAt: job.startedAt ?? null,
    finishedAt: job.finishedAt ?? null,
  };
}

module.exports = { ProcessingService, toPublicJob, JobError };
