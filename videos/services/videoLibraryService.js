// Use-case orchestration of UC-VID-002 - "Gerir Biblioteca de Vídeos e
// Adicionar Vídeo". Every external dependency (database, object storage,
// media probe, users service) is injected, so the whole flow is tested with
// in-memory doubles and real ffprobe runs (see test/).
//
// Upload is split in two calls that mirror the use case steps:
//   createUpload  -> step 4  (pre-checks E2/E3/E4, record "uploading")
//   receiveContent-> steps 5-8 (transfer, "validating", ffprobe checks, storage,
//                    "available" or "rejected"); it runs to completion even if
//                    the client leaves after the transfer (FA6).

const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");
const { pipeline } = require("stream/promises");
const { Transform } = require("stream");

const { AppError } = require("../utils/errors");
const { VIDEO_STATUS } = require("../utils/status");
const { checkUploadRequest } = require("./uploadRules");
const { validateProbe } = require("./videoValidator");
const defaultLimitsFor = require("../config/limits").limitsFor;

const OCCUPYING_STATUSES = [
  VIDEO_STATUS.UPLOADING,
  VIDEO_STATUS.VALIDATING,
  VIDEO_STATUS.AVAILABLE,
];
const RECENT_STATUSES = [
  VIDEO_STATUS.UPLOADING,
  VIDEO_STATUS.VALIDATING,
  VIDEO_STATUS.REJECTED,
];

class CancelledError extends Error {}

class VideoLibraryService {
  constructor({
    videoRepository,
    jobRepository,
    objectStorage,
    mediaProbe,
    userProfiles,
    tmpDir,
    limitsFor = defaultLimitsFor,
    now = () => Date.now(),
    logger = console,
  }) {
    this.videos = videoRepository;
    this.jobs = jobRepository;
    this.storage = objectStorage;
    this.probe = mediaProbe;
    this.profiles = userProfiles;
    this.tmpDir = tmpDir;
    this.limitsFor = limitsFor;
    this.now = now;
    this.log = logger;
    this.activeUploads = new Map(); // videoId -> { cancel(): void }
    this.userLocks = new Map(); // userId -> Promise (serialises step 4 per user)
  }

  // ------------------------------------------------------------------ access

  /** E1 / RN1 / REQ-VID-LIB-049: only Registered ("free") and Premium users. */
  async resolveProfile(userId) {
    const type = await this.profiles.getUserType(userId);
    const limits = this.limitsFor(type);
    if (!limits) {
      throw new AppError(403, "anonymous_not_allowed", "The video library requires a registered account.");
    }
    return { type, limits };
  }

  /** RN3 / REQ-VID-LIB-032, REQ-VID-LIB-033: a user only reaches their own videos. */
  async getOwnedVideo(userId, videoId) {
    const video = await this.videos.findById(videoId);
    if (!video) throw new AppError(404, "video_not_found", "Video not found.");
    if (video.userId !== userId) {
      throw new AppError(403, "forbidden", "You do not have permission to access this video.");
    }
    return video;
  }

  // ------------------------------------------------------------ step 1 / FA4

  /**
   * Step 1: available videos + storage used vs. limit (REQ-VID-LIB-002, 030),
   * plus the "recent uploads" panel (RN14 / REQ-VID-LIB-061).
   * Read-only: never touches the daily operations quota (REQ-VID-LIB-034).
   */
  async getLibrary(userId) {
    const { type, limits } = await this.resolveProfile(userId);
    const [videos, recent, usedBytes, reservedBytes] = await Promise.all([
      this.videos.listByUser(userId, [VIDEO_STATUS.AVAILABLE]),
      this.videos.listByUser(userId, RECENT_STATUSES),
      this.videos.sumSize(userId, [VIDEO_STATUS.AVAILABLE]),
      this.videos.sumSize(userId, [VIDEO_STATUS.UPLOADING, VIDEO_STATUS.VALIDATING]),
    ]);

    return {
      profile: type,
      limits: publicLimits(limits),
      storage: { usedBytes, reservedBytes, limitBytes: limits.storageBytes },
      videos: videos.map(toPublic),
      recent: recent.map(toPublic),
    };
  }

  /** FA4 / REQ-VID-LIB-031: metadata of one owned video. */
  async getVideo(userId, videoId) {
    await this.resolveProfile(userId);
    return toPublic(await this.getOwnedVideo(userId, videoId));
  }

  // ------------------------------------------------------------------ step 4

  /**
   * Step 4: validates format, size and free space before creating anything,
   * then creates the record with a unique id and status "uploading".
   * REQ-VID-LIB-007, 015, 017, 025, 026, 027, 050, 056.
   */
  async createUpload(userId, request, { sessionExpiresAt } = {}) {
    const { limits } = await this.resolveProfile(userId);

    return this.withUserLock(userId, async () => {
      // Uploads in progress reserve their size, so two parallel uploads cannot
      // overflow the library limit together.
      const occupied = await this.videos.sumSize(userId, OCCUPYING_STATUSES);
      const accepted = checkUploadRequest(request, limits, occupied);

      const video = await this.videos.create({
        userId,
        name: accepted.name,
        format: accepted.format,
        mimeType: accepted.mimeType,
        sizeBytes: accepted.sizeBytes,
        status: VIDEO_STATUS.UPLOADING,
        sessionExpiresAt: sessionExpiresAt ? new Date(sessionExpiresAt) : undefined,
      });
      return toPublic(video);
    });
  }

  // ------------------------------------------------------------- steps 5 - 8

  /**
   * Receives the file bytes (step 5) and runs validation and storage
   * (steps 6-8). Resolves with the final public video (status "available" or
   * "rejected"); throws AppError for interruptions, cancellations, expired
   * sessions and storage failures - in those cases nothing is left behind
   * (Garantia Mínima, REQ-VID-LIB-013, 014).
   */
  async receiveContent(userId, videoId, source, { sessionExpiresAt } = {}) {
    const { limits } = await this.resolveProfile(userId);
    let video = await this.getOwnedVideo(userId, videoId);

    if (video.status !== VIDEO_STATUS.UPLOADING || this.activeUploads.has(videoId)) {
      throw new AppError(409, "invalid_state", "This upload is not waiting for content.");
    }

    const tmpPath = this.tmpPathOf(videoId);
    const expiresAt = sessionExpiresAt ?? video.sessionExpiresAt;

    // ---- Step 5: transfer, cancellable while "uploading" (FA2) ----
    let cancelled = false;
    let received = 0;
    const counter = new Transform({
      transform: (chunk, _enc, cb) => {
        received += chunk.length;
        if (received > video.sizeBytes) {
          cb(new AppError(400, "upload_size_mismatch", "The file is larger than declared."));
        } else cb(null, chunk);
      },
    });

    this.activeUploads.set(videoId, {
      cancel: () => {
        cancelled = true;
        counter.destroy(new CancelledError("cancelled"));
      },
    });

    try {
      await fsp.mkdir(this.tmpDir, { recursive: true });
      await pipeline(source, counter, fs.createWriteStream(tmpPath));
      if (received !== video.sizeBytes) {
        throw new AppError(400, "upload_incomplete", "The upload did not complete.");
      }
    } catch (err) {
      await this.discard(video, tmpPath);
      if (cancelled || err instanceof CancelledError) {
        throw new AppError(409, "upload_cancelled", "The upload was cancelled.");
      }
      if (err instanceof AppError) throw err;
      // E10 / REQ-VID-LIB-039: connection lost during the transfer.
      throw new AppError(400, "upload_interrupted", "The upload was interrupted by a connection failure.");
    } finally {
      this.activeUploads.delete(videoId);
    }

    // ---- Step 6: "validating" - no cancel available from now on (REQ-VID-LIB-012) ----
    video = await this.videos.update(videoId, {
      status: VIDEO_STATUS.VALIDATING,
      uploadedAt: new Date(this.now()),
    });
    if (!video) {
      // the record was removed meanwhile (e.g. the account was deleted)
      await removeQuietly(tmpPath);
      throw new AppError(409, "upload_cancelled", "The upload was cancelled.");
    }

    // ---- Steps 6-7: technical validation and metadata (REQ-VID-LIB-019..023, 051..055) ----
    let result;
    try {
      result = validateProbe(await this.probe.probe(tmpPath), limits);
    } catch (err) {
      this.log.error("[videos] probe failed", err);
      result = { ok: false, rejection: { code: "corrupted", details: {} } };
    }

    if (!result.ok) {
      // RN7: a failed validation leaves the record "rejected" with the reason
      // (shown in the recent uploads panel - RN14); the bytes are removed
      // (REQ-VID-LIB-014) and the video takes no space.
      await removeQuietly(tmpPath);
      const rejected = await this.videos.update(videoId, {
        status: VIDEO_STATUS.REJECTED,
        rejection: result.rejection,
      });
      return toPublic(rejected);
    }

    // ---- E12 / REQ-VID-LIB-043: session expired before step 8 ----
    // (checked again after storage, below)
    try {
      this.assertSessionValid(expiresAt);
    } catch (err) {
      await this.discard(video, tmpPath);
      throw err;
    }

    // ---- Step 8: persistent storage (REQ-VID-LIB-028), E11 / REQ-VID-LIB-044 ----
    const storageKey = `videos/${videoId}.${video.format}`;
    try {
      await this.storage.put(userId, storageKey, tmpPath, storedContentType(video.format));
    } catch (err) {
      this.log.error("[videos] storage failure", err);
      await this.storage.remove(userId, storageKey).catch(() => {});
      await this.discard(video, tmpPath);
      throw new AppError(500, "storage_failure", "The video could not be stored.");
    }

    try {
      this.assertSessionValid(expiresAt);
    } catch (err) {
      await this.storage.remove(userId, storageKey).catch(() => {});
      await this.discard(video, tmpPath);
      throw err;
    }

    await removeQuietly(tmpPath);
    // REQ-VID-LIB-029 / 059: becomes "available" and starts counting as used space.
    const available = await this.videos.update(videoId, {
      status: VIDEO_STATUS.AVAILABLE,
      storageKey,
      availableAt: new Date(this.now()),
      ...result.metadata,
    });
    return toPublic(available);
  }

  assertSessionValid(expiresAt) {
    if (expiresAt && this.now() >= new Date(expiresAt).getTime()) {
      throw new AppError(401, "session_expired", "Your session expired. Please sign in again.");
    }
  }

  // --------------------------------------------------------------------- FA2

  /** FA2 / REQ-VID-LIB-012, 013: cancel only while "uploading". */
  async cancelUpload(userId, videoId) {
    await this.resolveProfile(userId);
    const video = await this.getOwnedVideo(userId, videoId);

    if (video.status !== VIDEO_STATUS.UPLOADING) {
      throw new AppError(409, "cannot_cancel", "The upload can only be cancelled while it is uploading.", {
        status: video.status,
      });
    }

    const active = this.activeUploads.get(videoId);
    if (active) {
      active.cancel(); // receiveContent removes partial data and the record
    } else {
      await this.discard(video, this.tmpPathOf(videoId));
    }
  }

  // --------------------------------------------------------------------- FA7

  /** FA7 / REQ-VID-LIB-062: dismiss the notice of a rejected video. */
  async dismissRejected(userId, videoId) {
    await this.resolveProfile(userId);
    const video = await this.getOwnedVideo(userId, videoId);
    if (video.status !== VIDEO_STATUS.REJECTED) {
      throw new AppError(409, "not_rejected", "Only rejected videos can be dismissed.");
    }
    await this.videos.delete(videoId);
  }

  // --------------------------------------------------------------- FA5 / E13

  /**
   * FA5 / REQ-VID-LIB-057: deletes an available video and frees its space.
   * E13 / REQ-VID-LIB-058: refused while it is the source of a queued or
   * processing request.
   */
  async deleteVideo(userId, videoId) {
    await this.resolveProfile(userId);
    const video = await this.getOwnedVideo(userId, videoId);

    if (video.status !== VIDEO_STATUS.AVAILABLE) {
      throw new AppError(409, "not_available", "Only available videos can be deleted.", {
        status: video.status,
      });
    }
    if (await this.jobs.hasActiveForVideo(videoId)) {
      throw new AppError(409, "video_in_use", "This video is being used by an operation in progress.");
    }

    await this.storage.remove(userId, video.storageKey);
    await this.videos.delete(videoId);
  }

  // ------------------------------------------------------- account deletion

  /**
   * RN13: videos are kept only while the account is active. Called by the
   * users service when an account is deleted: removes every video of the
   * user (any status - uploads in progress are cancelled), the stored files
   * and the user's processing requests. Does not check the profile, because
   * the account may already be gone.
   * @returns {Promise<number>} number of video records removed
   */
  async deleteAllForUser(userId) {
    const all = await this.videos.listByUser(userId, Object.values(VIDEO_STATUS));
    for (const video of all) {
      const active = this.activeUploads.get(video._id);
      if (active) active.cancel(); // receiveContent cleans its own record
      if (video.storageKey) {
        await this.storage.remove(userId, video.storageKey).catch((err) =>
          this.log.error("[videos] could not remove stored file", video.storageKey, err),
        );
      }
      await this.discard(video, this.tmpPathOf(video._id));
    }
    await this.jobs.deleteByUser(userId);
    return all.length;
  }

  // ------------------------------------------------------------- maintenance

  /**
   * Removes leftovers that no running request owns: uploads whose content
   * never arrived and records interrupted by a restart (Garantia Mínima,
   * REQ-VID-LIB-013/014). Used at startup (olderThanMs = 0) and periodically.
   */
  async sweepOrphans({ olderThanMs = 0 } = {}) {
    const options = olderThanMs > 0 ? { createdBefore: new Date(this.now() - olderThanMs) } : {};
    const stale = await this.videos.findByStatuses(
      [VIDEO_STATUS.UPLOADING, VIDEO_STATUS.VALIDATING],
      options,
    );
    let removed = 0;
    for (const video of stale) {
      if (this.activeUploads.has(video._id)) continue;
      if (video.status === VIDEO_STATUS.VALIDATING && olderThanMs > 0) continue; // still being processed
      await this.discard(video, this.tmpPathOf(video._id));
      removed += 1;
    }
    return removed;
  }

  // ----------------------------------------------------------------- helpers

  tmpPathOf(videoId) {
    return path.join(this.tmpDir, `${videoId}.upload`);
  }

  async discard(video, tmpPath) {
    await removeQuietly(tmpPath);
    await this.videos.delete(video._id);
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

async function removeQuietly(file) {
  await fsp.rm(file, { force: true }).catch(() => {});
}

/**
 * Content-Type with which the file is stored and later served to the browser
 * (UC-VID-003). MOV and MP4 use the same ISO base media file structure and
 * the browsers' MP4 demuxer plays H.264/AAC MOV files, but Firefox refuses
 * anything announced as "video/quicktime". Storing MOV files as "video/mp4"
 * lets Chrome and Firefox play them natively (REQ-VID-PLAY-024, 049). The
 * library record keeps the real format ("mov").
 */
function storedContentType(format) {
  return "video/mp4";
}

function publicLimits(limits) {
  return {
    maxFileBytes: limits.maxFileBytes,
    maxDurationSec: limits.maxDurationSec,
    maxLongSide: limits.maxLongSide,
    maxShortSide: limits.maxShortSide,
    storageBytes: limits.storageBytes,
    resolutionLabel: limits.resolutionLabel,
  };
}

/** Public representation (never exposes storage keys or session data). */
function toPublic(video) {
  return {
    _id: String(video._id),
    name: video.name,
    format: video.format,
    sizeBytes: video.sizeBytes,
    status: video.status,
    durationSec: video.durationSec ?? null,
    width: video.width ?? null,
    height: video.height ?? null,
    videoCodec: video.videoCodec ?? null,
    audioCodec: video.audioCodec ?? null,
    rejection: video.status === VIDEO_STATUS.REJECTED ? video.rejection ?? null : null,
    createdAt: video.createdAt ?? null,
    availableAt: video.availableAt ?? null,
  };
}

module.exports = { VideoLibraryService, toPublic, storedContentType, OCCUPYING_STATUSES };
