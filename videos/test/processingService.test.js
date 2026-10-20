// Component tests of UC-VID-001 (ProcessingService + trim tool).
// Successful runs use the real FFmpeg/ffprobe on generated videos; failures,
// slow runs and cancellations use FFmpeg doubles.
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { ProcessingService } = require("../services/processingService");
const { VideoLibraryService } = require("../services/videoLibraryService");
const ffmpegAdapter = require("../services/tools/ffmpegAdapter");
const mediaProbe = require("../services/mediaProbe");
const { LIMITS, MiB } = require("../config/limits");
const {
  createMemoryRepositories,
  createFakeStorage,
  createFakeProfiles,
  createFakeQuota,
} = require("./helpers/memoryRepositories");
const { fixtures, hasFfmpeg } = require("./helpers/fixtures");

const ffmpegMissing = !hasFfmpeg() && "FFmpeg not installed";
const ALICE = "aaaaaaaaaaaaaaaaaaaaaaaa"; // Registered
const BOB = "bbbbbbbbbbbbbbbbbbbbbbbb"; // Premium
const ANON = "cccccccccccccccccccccccc";
const DAVE = "dddddddddddddddddddddddd"; // second Premium user

/** FFmpeg double: never finishes until cancelled. */
function hangingFfmpeg() {
  const calls = { runs: 0, cancels: 0 };
  return {
    calls,
    run(args, { onProgress } = {}) {
      calls.runs += 1;
      let reject;
      const promise = new Promise((_, r) => (reject = r));
      setTimeout(() => onProgress && onProgress(40), 5);
      return {
        promise,
        cancel() {
          calls.cancels += 1;
          reject(new ffmpegAdapter.CancelledError());
        },
      };
    },
  };
}

/** FFmpeg double: fails the first `failures` runs, then uses the real one. */
function flakyFfmpeg(failures) {
  const calls = { runs: 0 };
  return {
    calls,
    run(args, opts) {
      calls.runs += 1;
      if (calls.runs <= failures) {
        return { promise: Promise.reject(new Error("encoder crashed")), cancel() {} };
      }
      return ffmpegAdapter.run(args, opts);
    },
  };
}

function setup({ ffmpeg = ffmpegAdapter, concurrency = 5, limitsFor, quotaLeft = { [ALICE]: 5 } } = {}) {
  const repos = createMemoryRepositories();
  const storage = createFakeStorage();
  const profiles = createFakeProfiles({ [ALICE]: "free", [BOB]: "premium", [ANON]: "anonymous", [DAVE]: "premium" });
  const quota = createFakeQuota({ ...quotaLeft });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "processing-test-"));
  const service = new ProcessingService({
    videoRepository: repos.videoRepository,
    jobRepository: repos.jobRepository,
    objectStorage: storage,
    mediaProbe,
    userProfiles: profiles,
    quota,
    tmpDir,
    ffmpeg,
    ...(limitsFor ? { limitsFor } : {}),
    config: { concurrency, maxAttempts: 2, progressWriteMs: 0 },
    logger: { error() {}, warn() {} },
  });

  /** Registers an available video backed by a real file (as UC-VID-002 would). */
  async function addVideo(userId, file, extra = {}) {
    const probe = await mediaProbe.probe(file);
    const v = probe.data.streams.find((s) => s.codec_type === "video");
    const format = path.extname(file).slice(1).toLowerCase() === "mov" ? "mov" : "mp4";
    const video = await repos.videoRepository.create({
      userId,
      name: path.basename(file),
      format,
      mimeType: format === "mov" ? "video/quicktime" : "video/mp4",
      sizeBytes: fs.statSync(file).size,
      status: "available",
      durationSec: Number(probe.data.format.duration),
      width: v.width,
      height: v.height,
      videoCodec: v.codec_name,
      ...extra,
    });
    const storageKey = `videos/${video._id}.${format}`;
    await repos.videoRepository.update(video._id, { storageKey });
    storage.objects.set(`${userId}/${storageKey}`, file);
    return { ...video, storageKey };
  }

  return { service, repos, storage, quota, tmpDir, addVideo };
}

const rejectsWith = (promise, status, code) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    assert.equal(err.status, status);
    return true;
  });

const sha256 = (file) => crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex");
const leftovers = (dir) => fs.readdirSync(dir).filter((f) => f.includes(".result."));

// ------------------------------------------------------------ happy path

test(
  "REQ-VID-TRIM-012/013/014/016/020/021/022: request queued, processed and stored as a new available video",
  { skip: ffmpegMissing },
  async () => {
    const { service, repos, storage, quota, addVideo } = setup();
    const src = await addVideo(ALICE, fixtures.h264AacMp4()); // 2 s, 320x240, 25 fps, AAC
    const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
    assert.equal(job.status, "queued");
    await service.idle();

    const done = await service.get(ALICE, job._id);
    assert.equal(done.status, "completed");
    assert.equal(done.progress, 100);
    const result = await repos.videoRepository.findById(done.resultVideoId);
    assert.equal(result.status, "available");
    assert.equal(result.format, "mp4");
    assert.deepEqual(quota.calls, [["reserve", ALICE]]); // reserved once, never refunded
    assert.equal(storage.calls.find((c) => c[0] === "put")[3], "video/mp4");
  },
);

test(
  "REQ-VID-TRIM-051/052: same resolution and frame rate, duration within ±1 s, audio kept as AAC",
  { skip: ffmpegMissing },
  async () => {
    const { service, repos, storage, addVideo } = setup();
    const src = await addVideo(ALICE, fixtures.h264AacMp4());
    const job = await service.create(ALICE, src._id, "trim", { startSec: 1, endSec: 2 });
    await service.idle();
    const result = await repos.videoRepository.findById((await service.get(ALICE, job._id)).resultVideoId);
    const probe = await mediaProbe.probe(storage.objects.get(`${ALICE}/${result.storageKey}`));
    const v = probe.data.streams.find((s) => s.codec_type === "video");
    const a = probe.data.streams.find((s) => s.codec_type === "audio");
    assert.deepEqual([v.width, v.height, v.codec_name, v.r_frame_rate], [320, 240, "h264", "25/1"]);
    assert.equal(a.codec_name, "aac");
    assert.ok(Math.abs(Number(probe.data.format.duration) - 1) <= 1);
  },
);

test("REQ-VID-TRIM-054/055: original untouched and result independent from it", { skip: ffmpegMissing }, async () => {
  const { service, repos, addVideo } = setup();
  const file = fixtures.h264AacMp4();
  const before = sha256(file);
  const src = await addVideo(ALICE, file);
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await service.idle();
  assert.equal(sha256(file), before);
  await repos.videoRepository.delete(src._id);
  const done = await service.get(ALICE, job._id);
  assert.equal((await repos.videoRepository.findById(done.resultVideoId)).status, "available");
});

test("REQ-VID-TRIM-010: default name {original}_recorte_{start}-{end}; REQ-009 custom name", { skip: ffmpegMissing }, async () => {
  const { service, addVideo } = setup({ quotaLeft: {} });
  const src = await addVideo(BOB, fixtures.h264AacMp4());
  const a = await service.create(BOB, src._id, "trim", { startSec: 0, endSec: 1 });
  const b = await service.create(BOB, src._id, "trim", { startSec: 0, endSec: 1, name: "meu_corte" });
  assert.equal(a.params.name, "h264_aac_recorte_0-1");
  assert.equal(b.params.name, "meu_corte");
  await service.idle();
});

test("REQ-VID-TRIM-007/008: output MOV from an MP4 (default = original format)", { skip: ffmpegMissing }, async () => {
  const { service, repos, storage, addVideo } = setup({ quotaLeft: {} });
  const src = await addVideo(BOB, fixtures.h264AacMp4());
  const dflt = await service.create(BOB, src._id, "trim", { startSec: 0, endSec: 1 });
  assert.equal(dflt.params.outputFormat, "mp4");
  const mov = await service.create(BOB, src._id, "trim", { startSec: 0, endSec: 1, outputFormat: "MOV" });
  await service.idle();
  const result = await repos.videoRepository.findById((await service.get(BOB, mov._id)).resultVideoId);
  assert.equal(result.format, "mov");
  assert.match(result.storageKey, /\.mov$/);
  const probe = await mediaProbe.probe(storage.objects.get(`${BOB}/${result.storageKey}`));
  assert.match(probe.data.format.format_name, /mov/);
});

// --------------------------------------------------------------- E2 / FA1

test("REQ-VID-TRIM-037/038/039/041 (E2): invalid intervals refused with the reason", { skip: ffmpegMissing }, async () => {
  const { service, quota, addVideo } = setup();
  const src = await addVideo(ALICE, fixtures.h264AacMp4()); // 2 s
  const cases = [
    [{ startSec: 1, endSec: 1 }, "start_not_before_end"],
    [{ startSec: 1, endSec: 0 }, "start_not_before_end"],
    [{ startSec: 0, endSec: 3 }, "end_after_duration"],
    [{ startSec: -1, endSec: 1 }, "start_negative"],
    [{ startSec: 0.5, endSec: 1 }, "not_whole_seconds"],
  ];
  for (const [req, reason] of cases) {
    await assert.rejects(service.create(ALICE, src._id, "trim", req), (e) => e.code === "invalid_interval" && e.details.reason === reason);
  }
  assert.equal(quota.calls.length, 0);
});

test("REQ-VID-TRIM-026/027 (FA1): whole-video interval needs confirmation", { skip: ffmpegMissing }, async () => {
  const { service, addVideo } = setup({ concurrency: 0 });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  await rejectsWith(service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 2 }), 409, "full_copy_confirmation_required");
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 2, confirmFullCopy: true });
  assert.equal(job.status, "queued");
});

// ------------------------------------------------------------- E3 / E4

test("REQ-VID-TRIM-042 (E3): no daily operations left -> refused, no request created", { skip: ffmpegMissing }, async () => {
  const { service, repos, addVideo } = setup({ quotaLeft: { [ALICE]: 0 } });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  await assert.rejects(service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 }), (e) => {
    assert.equal(e.code, "daily_quota_exhausted");
    assert.ok(e.details.resetAt);
    return true;
  });
  assert.equal(repos.jobs.length, 0);
});

test("REQ-VID-TRIM-043 (E4): Registered limited to 1 active request", { skip: ffmpegMissing }, async () => {
  const { service, quota, addVideo } = setup({ concurrency: 0 });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await rejectsWith(service.checkEligibility(ALICE, src._id), 409, "processing_in_progress");
  await rejectsWith(service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 }), 409, "processing_in_progress");
  assert.equal(quota.calls.filter((c) => c[0] === "reserve").length, 1);
});

test("REQ-VID-TRIM-043 / RN4: Premium can have up to 3 active requests", { skip: ffmpegMissing }, async () => {
  const { service, addVideo } = setup({ concurrency: 0, quotaLeft: {} });
  const src = await addVideo(BOB, fixtures.h264AacMp4());
  for (let i = 0; i < 3; i++) await service.create(BOB, src._id, "trim", { startSec: 0, endSec: 1 });
  await rejectsWith(service.create(BOB, src._id, "trim", { startSec: 0, endSec: 1 }), 409, "processing_in_progress");
});

// ------------------------------------------------------------------- E7

test("REQ-VID-TRIM-062 (E7): estimated result does not fit -> refused without using quota", { skip: ffmpegMissing }, async () => {
  const file = fixtures.h264AacMp4();
  const tiny = (type) => (type === "free" ? { ...LIMITS.free, storageBytes: fs.statSync(file).size + 10 } : LIMITS[type] ?? null);
  const { service, quota, addVideo } = setup({ limitsFor: tiny });
  const src = await addVideo(ALICE, file); // library almost full
  await rejectsWith(service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 }), 507, "insufficient_storage_for_result");
  assert.equal(quota.calls.length, 0);
});

test("REQ-VID-TRIM-063 (E7): real result does not fit at the end -> failed, refund, nothing stored", { skip: ffmpegMissing }, async () => {
  const file = fixtures.h264AacMp4();
  const limits = { ...LIMITS.free, storageBytes: 500 * MiB };
  const { service, repos, quota, tmpDir, addVideo } = setup({ limitsFor: (t) => (t === "free" ? limits : LIMITS[t] ?? null), concurrency: 0 });
  const src = await addVideo(ALICE, file);
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  limits.storageBytes = fs.statSync(file).size + 1; // space used meanwhile
  service.config.concurrency = 5;
  await service.pump();
  await service.idle();
  const done = await service.get(ALICE, job._id);
  assert.equal(done.status, "failed");
  assert.equal(done.error.code, "insufficient_storage");
  assert.deepEqual(quota.calls.map((c) => c[0]), ["reserve", "refund"]);
  assert.equal([...repos.videos.values()].length, 1); // only the original
  assert.deepEqual(leftovers(tmpDir), []);
});

// ------------------------------------------------------------------- E5

test("REQ-VID-TRIM-044 (E5/RN7): a failure is retried once automatically", { skip: ffmpegMissing }, async () => {
  const ffmpeg = flakyFfmpeg(1);
  const { service, quota, addVideo } = setup({ ffmpeg });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await service.idle();
  const done = await service.get(ALICE, job._id);
  assert.equal(done.status, "completed");
  assert.equal(done.attempts, 2);
  assert.equal(quota.calls.filter((c) => c[0] === "refund").length, 0);
});

test("REQ-VID-TRIM-045/046/056 (E5): two failures -> failed, operation refunded, no partial files", { skip: ffmpegMissing }, async () => {
  const ffmpeg = flakyFfmpeg(2);
  const { service, repos, quota, tmpDir, addVideo } = setup({ ffmpeg });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await service.idle();
  const done = await service.get(ALICE, job._id);
  assert.equal(done.status, "failed");
  assert.equal(done.error.code, "processing_failed");
  assert.equal(ffmpeg.calls.runs, 2);
  assert.equal(quota.remaining[ALICE], 5);
  assert.equal(repos.videos.size, 1);
  assert.deepEqual(leftovers(tmpDir), []);
});

// ------------------------------------------------------------------- FA2

test("REQ-VID-TRIM-028/031/032/033/056 (FA2): cancel while processing stops FFmpeg and refunds", { skip: ffmpegMissing }, async () => {
  const ffmpeg = hangingFfmpeg();
  const { service, repos, quota, tmpDir, addVideo } = setup({ ffmpeg });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  for (let i = 0; i < 500 && (await service.get(ALICE, job._id)).progress !== 40; i++) {
    await new Promise((r) => setTimeout(r, 5));
  }
  const running = await service.get(ALICE, job._id);
  assert.equal(running.status, "processing");
  assert.equal(running.progress, 40); // RN8: progress reported while processing

  const cancelled = await service.cancel(ALICE, job._id);
  assert.equal(cancelled.status, "cancelled");
  await service.idle();
  assert.equal((await service.get(ALICE, job._id)).status, "cancelled");
  assert.equal(ffmpeg.calls.cancels, 1);
  assert.equal(quota.remaining[ALICE], 5);
  assert.equal(repos.videos.size, 1);
  assert.deepEqual(leftovers(tmpDir), []);
});

test("FA2: cancel a queued request", { skip: ffmpegMissing }, async () => {
  const { service, quota, addVideo } = setup({ concurrency: 0 });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  assert.equal((await service.cancel(ALICE, job._id)).status, "cancelled");
  assert.equal(quota.remaining[ALICE], 5);
});

test("REQ-VID-TRIM-029: finished requests cannot be cancelled", { skip: ffmpegMissing }, async () => {
  const { service, addVideo } = setup();
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await service.idle();
  await rejectsWith(service.cancel(ALICE, job._id), 409, "cannot_cancel_request");
});

// ------------------------------------------------- E1, access, E6, FA3

test("REQ-VID-TRIM-036 (E1, defensive): non-H.264 source refused before opening the screen", { skip: ffmpegMissing }, async () => {
  const { service, quota, addVideo } = setup();
  const src = await addVideo(ALICE, fixtures.h264AacMp4(), { videoCodec: "mpeg4" });
  await rejectsWith(service.checkEligibility(ALICE, src._id), 422, "unsupported_for_processing");
  assert.equal(quota.calls.length, 0);
});

test("REQ-VID-TRIM-059: other users and anonymous users are refused", { skip: ffmpegMissing }, async () => {
  const { service, addVideo } = setup({ concurrency: 0 });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await rejectsWith(service.create(BOB, src._id, "trim", { startSec: 0, endSec: 1 }), 403, "forbidden");
  await rejectsWith(service.get(BOB, job._id), 403, "forbidden");
  await rejectsWith(service.cancel(BOB, job._id), 403, "forbidden");
  await rejectsWith(service.list(ANON), 403, "anonymous_not_allowed");
});

test("REQ-VID-TRIM-048/049 (cf. REQ-VID-LIB-058): source cannot be deleted while the request is active", { skip: ffmpegMissing }, async () => {
  const { service, repos, storage, addVideo } = setup({ concurrency: 0 });
  const library = new VideoLibraryService({
    videoRepository: repos.videoRepository,
    jobRepository: repos.jobRepository,
    objectStorage: storage,
    mediaProbe,
    userProfiles: createFakeProfiles({ [ALICE]: "free" }),
    tmpDir: os.tmpdir(),
    logger: { error() {} },
  });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await rejectsWith(library.deleteVideo(ALICE, src._id), 409, "video_in_use");
  await service.cancel(ALICE, job._id);
  await library.deleteVideo(ALICE, src._id);
});

test("REQ-VID-TRIM-034 (FA3): requests interrupted by a restart are resumed", { skip: ffmpegMissing }, async () => {
  const { service, repos, addVideo } = setup({ concurrency: 0 });
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await repos.jobRepository.update(job._id, { status: "processing", attempts: 1 }); // process died
  service.config.concurrency = 5;
  await service.recover();
  await service.idle();
  const done = await service.get(ALICE, job._id);
  assert.equal(done.status, "completed");
  assert.equal(done.attempts, 2);
});

test("REQ-VID-TRIM-023/035: finished requests are marked as seen once notified", { skip: ffmpegMissing }, async () => {
  const { service, addVideo } = setup();
  const src = await addVideo(ALICE, fixtures.h264AacMp4());
  const job = await service.create(ALICE, src._id, "trim", { startSec: 0, endSec: 1 });
  await service.idle();
  assert.equal((await service.list(ALICE))[0].seen, false);
  await service.markSeen(ALICE, job._id);
  assert.equal((await service.list(ALICE))[0].seen, true);
});

test("REQ-VID-TRIM-058 / A6: at most 5 requests run at once; the next one waits queued and starts when a slot frees", { skip: ffmpegMissing }, async () => {
  const ffmpeg = hangingFfmpeg();
  const { service, addVideo } = setup({ ffmpeg, quotaLeft: {} });
  const b = await addVideo(BOB, fixtures.h264AacMp4());
  const d = await addVideo(DAVE, fixtures.h264AacMp4());
  const jobs = [];
  for (let i = 0; i < 3; i++) jobs.push(await service.create(BOB, b._id, "trim", { startSec: 0, endSec: 1 }));
  for (let i = 0; i < 3; i++) jobs.push(await service.create(DAVE, d._id, "trim", { startSec: 0, endSec: 1 }));

  const statuses = async () => Promise.all(jobs.map(async (j) => (await service.get(j.sourceVideoId === b._id ? BOB : DAVE, j._id)).status));
  for (let i = 0; i < 500 && ffmpeg.calls.runs < 5; i++) await new Promise((r) => setTimeout(r, 5));
  await new Promise((r) => setTimeout(r, 50));
  let s = await statuses();
  assert.equal(s.filter((x) => x === "processing").length, 5);
  assert.equal(s.filter((x) => x === "queued").length, 1);
  assert.equal(s.at(-1), "queued"); // first come, first served
  assert.equal(ffmpeg.calls.runs, 5);

  await service.cancel(BOB, jobs[0]._id); // frees one slot
  for (let i = 0; i < 500 && ffmpeg.calls.runs < 6; i++) await new Promise((r) => setTimeout(r, 5));
  s = await statuses();
  assert.equal(s.at(-1), "processing");
  assert.equal(s.filter((x) => x === "processing").length, 5);

  for (const j of jobs.slice(1)) await service.cancel(j.sourceVideoId === b._id ? BOB : DAVE, j._id);
  await service.idle();
});
