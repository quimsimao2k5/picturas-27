// Component tests of the whole UC-VID-002 flow (VideoLibraryService) with
// in-memory repositories/storage and the real ffprobe.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { PassThrough, Readable } = require("stream");

const { VideoLibraryService } = require("../services/videoLibraryService");
const mediaProbe = require("../services/mediaProbe");
const { LIMITS, MiB } = require("../config/limits");
const { createMemoryRepositories, createFakeStorage, createFakeProfiles } = require("./helpers/memoryRepositories");
const { fixtures, hasFfmpeg } = require("./helpers/fixtures");

const ffmpegMissing = !hasFfmpeg() && "FFmpeg not installed";
const ALICE = "aaaaaaaaaaaaaaaaaaaaaaaa"; // Registered ("free")
const BOB = "bbbbbbbbbbbbbbbbbbbbbbbb"; // Premium
const ANON = "cccccccccccccccccccccccc"; // Anonymous

function setup({ limitsFor, now } = {}) {
  const repos = createMemoryRepositories();
  const storage = createFakeStorage();
  const profiles = createFakeProfiles({ [ALICE]: "free", [BOB]: "premium", [ANON]: "anonymous" });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "videos-test-"));
  const probeCalls = [];
  const probe = {
    async probe(file) {
      probeCalls.push(file);
      return mediaProbe.probe(file);
    },
  };
  const service = new VideoLibraryService({
    videoRepository: repos.videoRepository,
    jobRepository: repos.jobRepository,
    objectStorage: storage,
    mediaProbe: probe,
    userProfiles: profiles,
    tmpDir,
    ...(limitsFor ? { limitsFor } : {}),
    ...(now ? { now } : {}),
    logger: { error() {} },
  });
  return { service, repos, storage, profiles, tmpDir, probeCalls };
}

async function upload(service, userId, file, name = path.basename(file), opts = {}) {
  const size = fs.statSync(file).size;
  const created = await service.createUpload(userId, { fileName: name, sizeBytes: size }, opts);
  const result = await service.receiveContent(userId, created._id, fs.createReadStream(file), opts);
  return { created, result };
}

const rejectsWith = (promise, code) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    return true;
  });

const tmpFiles = (dir) => fs.readdirSync(dir);

/** Waits until a condition holds (avoids timing-dependent tests). */
async function waitFor(cond, timeoutMs = 5000) {
  const start = Date.now();
  while (!(await cond())) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timeout");
    await new Promise((r) => setTimeout(r, 5));
  }
}

// --------------------------------------------------------------- E1 / RN1

test("REQ-VID-LIB-049 (E1): anonymous user cannot open the library nor upload (403)", async () => {
  const { service, repos } = setup();
  await assert.rejects(service.getLibrary(ANON), (e) => e.status === 403 && e.code === "anonymous_not_allowed");
  await rejectsWith(service.createUpload(ANON, { fileName: "a.mp4", sizeBytes: 10 }), "anonymous_not_allowed");
  assert.equal(repos.videos.size, 0);
});

test("REQ-VID-LIB-001: Registered and Premium users open their library", async () => {
  const { service } = setup();
  const a = await service.getLibrary(ALICE);
  const b = await service.getLibrary(BOB);
  assert.equal(a.storage.limitBytes, 500 * MiB);
  assert.equal(b.storage.limitBytes, 10 * 1024 * MiB);
});

// -------------------------------------------------------------- happy path

test(
  "REQ-VID-LIB-008/022/023/024/028/029/059: valid video becomes available with metadata and counts as used space",
  { skip: ffmpegMissing },
  async () => {
    const { service, storage, tmpDir } = setup();
    const file = fixtures.h264AacMp4();
    const { created, result } = await upload(service, ALICE, file, "aula.mp4");

    assert.equal(created.status, "uploading"); // REQ-VID-LIB-056
    assert.equal(result.status, "available");
    assert.equal(result.width, 320);
    assert.equal(result.height, 240);
    assert.equal(result.sizeBytes, fs.statSync(file).size);
    assert.ok(result.durationSec > 1.5);
    assert.deepEqual(storage.calls[0], ["put", ALICE, `videos/${created._id}.mp4`, "video/mp4"]);
    assert.deepEqual(tmpFiles(tmpDir), []); // temporary file removed

    const lib = await service.getLibrary(ALICE);
    assert.equal(lib.videos.length, 1);
    assert.equal(lib.storage.usedBytes, fs.statSync(file).size);
  },
);

test("REQ-VID-PLAY-024/049: MOV files are stored as video/mp4 so browsers play them natively", { skip: ffmpegMissing }, async () => {
  const { service, storage } = setup();
  const { created, result } = await upload(service, ALICE, fixtures.h264NoAudioMov(), "clip.mov");
  assert.equal(result.format, "mov"); // the library keeps the real format
  assert.deepEqual(storage.calls[0], ["put", ALICE, `videos/${created._id}.mov`, "video/mp4"]);
});

test("REQ-VID-LIB-026/027 (RN9): two uploads with the same name keep two ids", { skip: ffmpegMissing }, async () => {
  const { service } = setup();
  const file = fixtures.h264NoAudioMov();
  const one = await upload(service, ALICE, file, "aula.mov");
  const two = await upload(service, ALICE, file, "aula.mov");
  assert.notEqual(one.result._id, two.result._id);
  assert.equal((await service.getLibrary(ALICE)).videos.length, 2);
});

test("REQ-VID-LIB-056: status is 'validating' while the file is probed", { skip: ffmpegMissing }, async () => {
  const { service, repos } = setup();
  const file = fixtures.h264AacMp4();
  let seen = null;
  service.probe = {
    async probe(p) {
      seen = [...repos.videos.values()][0].status;
      return mediaProbe.probe(p);
    },
  };
  await upload(service, ALICE, file);
  assert.equal(seen, "validating");
});

// ------------------------------------------------------- step 4 (E2-E4)

test("REQ-VID-LIB-050 (E2): .avi rejected without creating any record", async () => {
  const { service, repos } = setup();
  await rejectsWith(service.createUpload(ALICE, { fileName: "a.avi", sizeBytes: 10 }), "unsupported_format");
  assert.equal(repos.videos.size, 0);
});

test("REQ-VID-LIB-017 (E4): uploads in progress reserve space", async () => {
  const { service } = setup();
  await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 90 * MiB });
  await service.createUpload(ALICE, { fileName: "b.mp4", sizeBytes: 90 * MiB });
  await service.createUpload(ALICE, { fileName: "c.mp4", sizeBytes: 90 * MiB });
  await service.createUpload(ALICE, { fileName: "d.mp4", sizeBytes: 90 * MiB });
  await service.createUpload(ALICE, { fileName: "e.mp4", sizeBytes: 90 * MiB });
  await rejectsWith(service.createUpload(ALICE, { fileName: "f.mp4", sizeBytes: 60 * MiB }), "insufficient_storage");
});

test("REQ-VID-LIB-017 (E4): parallel requests cannot overflow the library together", async () => {
  const { service } = setup();
  const attempts = await Promise.allSettled(
    Array.from({ length: 8 }, (_, i) => service.createUpload(ALICE, { fileName: `${i}.mp4`, sizeBytes: 90 * MiB })),
  );
  assert.equal(attempts.filter((a) => a.status === "fulfilled").length, 5);
});

// ----------------------------------------------------- steps 6-7 rejects

test(
  "REQ-VID-LIB-051/014 (E5): wrong video codec -> rejected with reason, nothing stored, temp removed",
  { skip: ffmpegMissing },
  async () => {
    const { service, storage, tmpDir } = setup();
    const { result } = await upload(service, ALICE, fixtures.mpeg4Mp4());
    assert.equal(result.status, "rejected");
    assert.equal(result.rejection.code, "unsupported_video_codec");
    assert.equal(storage.calls.length, 0);
    assert.deepEqual(tmpFiles(tmpDir), []);
  },
);

test(
  "REQ-VID-LIB-021/030/061 (RN14): rejected video only appears in the recent uploads panel and takes no space",
  { skip: ffmpegMissing },
  async () => {
    const { service } = setup();
    await upload(service, ALICE, fixtures.h264Mp3Mp4());
    const lib = await service.getLibrary(ALICE);
    assert.equal(lib.videos.length, 0);
    assert.equal(lib.recent.length, 1);
    assert.equal(lib.recent[0].rejection.code, "unsupported_audio_codec");
    assert.equal(lib.storage.usedBytes, 0);
  },
);

test("REQ-VID-LIB-020 (E7): truncated upload rejected as corrupted", { skip: ffmpegMissing }, async () => {
  const { service } = setup();
  const { result } = await upload(service, ALICE, fixtures.truncated());
  assert.equal(result.rejection.code, "corrupted");
});

test("REQ-VID-LIB-016 (E8): duration limit applied per profile", { skip: ffmpegMissing }, async () => {
  const short = (type) => (type === "free" ? { ...LIMITS.free, maxDurationSec: 1 } : LIMITS[type] ?? null);
  const { service } = setup({ limitsFor: short });
  const file = fixtures.h264AacMp4(); // 2 s
  assert.equal((await upload(service, ALICE, file)).result.rejection.code, "duration_exceeded");
  assert.equal((await upload(service, BOB, file)).result.status, "available");
});

test("REQ-VID-LIB-055 (E9): 4K rejected for Registered, vertical 1080x1920 accepted", { skip: ffmpegMissing }, async () => {
  const { service } = setup();
  assert.equal((await upload(service, ALICE, fixtures.uhd4k())).result.rejection.code, "resolution_exceeded");
  assert.equal((await upload(service, ALICE, fixtures.vertical1080())).result.status, "available");
});

// ------------------------------------------------- FA2, E10, E11, E12

test("REQ-VID-LIB-012/013 (FA2): cancel while uploading removes partial data and the record", async () => {
  const { service, repos, tmpDir } = setup();
  const created = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 1000 });
  const source = new PassThrough();
  const pending = service.receiveContent(ALICE, created._id, source);
  source.write(Buffer.alloc(300));
  await waitFor(() => service.activeUploads.has(created._id));

  await service.cancelUpload(ALICE, created._id);
  await rejectsWith(pending, "upload_cancelled");
  assert.equal(repos.videos.size, 0);
  assert.deepEqual(tmpFiles(tmpDir), []);
});

test("REQ-VID-LIB-012: cancel is refused once the video is 'validating'", async () => {
  const { service, repos } = setup();
  const created = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 10 });
  await repos.videoRepository.update(created._id, { status: "validating" });
  await rejectsWith(service.cancelUpload(ALICE, created._id), "cannot_cancel");
});

test("REQ-VID-LIB-039/014 (E10): connection failure mid-transfer cleans everything", async () => {
  const { service, repos, tmpDir } = setup();
  const created = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 1000 });
  const source = new Readable({ read() {} });
  const pending = service.receiveContent(ALICE, created._id, source);
  source.push(Buffer.alloc(200));
  setTimeout(() => source.destroy(new Error("ECONNRESET")), 20);
  await rejectsWith(pending, "upload_interrupted");
  assert.equal(repos.videos.size, 0);
  assert.deepEqual(tmpFiles(tmpDir), []);
});

test("E10: fewer bytes than declared is treated as an incomplete upload", async () => {
  const { service, repos } = setup();
  const created = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 1000 });
  await rejectsWith(service.receiveContent(ALICE, created._id, Readable.from([Buffer.alloc(10)])), "upload_incomplete");
  assert.equal(repos.videos.size, 0);
});

test("more bytes than declared is refused", async () => {
  const { service, repos } = setup();
  const created = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 10 });
  await rejectsWith(service.receiveContent(ALICE, created._id, Readable.from([Buffer.alloc(50)])), "upload_size_mismatch");
  assert.equal(repos.videos.size, 0);
});

test("REQ-VID-LIB-044/014 (E11): storage failure -> error, no record, no temp file", { skip: ffmpegMissing }, async () => {
  const { service, repos, storage, tmpDir } = setup();
  storage.failNextPut();
  await rejectsWith(upload(service, ALICE, fixtures.h264AacMp4()), "storage_failure");
  assert.equal(repos.videos.size, 0);
  assert.deepEqual(tmpFiles(tmpDir), []);
});

test("REQ-VID-LIB-043 (E12): expired session never makes the video available", { skip: ffmpegMissing }, async () => {
  const { service, repos, storage, tmpDir } = setup();
  const expired = Date.now() - 1000;
  await rejectsWith(upload(service, ALICE, fixtures.h264AacMp4(), "a.mp4", { sessionExpiresAt: expired }), "session_expired");
  assert.equal(repos.videos.size, 0);
  assert.equal(storage.objects.size, 0);
  assert.deepEqual(tmpFiles(tmpDir), []);
});

// --------------------------------------------------------- FA5, E13, FA7

test("REQ-VID-LIB-057 (FA5): deleting an available video frees its space", { skip: ffmpegMissing }, async () => {
  const { service, storage } = setup();
  const { result } = await upload(service, ALICE, fixtures.h264AacMp4());
  await service.deleteVideo(ALICE, result._id);
  const lib = await service.getLibrary(ALICE);
  assert.equal(lib.videos.length, 0);
  assert.equal(lib.storage.usedBytes, 0);
  assert.equal(storage.objects.size, 0);
});

test("REQ-VID-LIB-058 (E13): deletion refused while a request is queued/processing", { skip: ffmpegMissing }, async () => {
  const { service, repos } = setup();
  const { result } = await upload(service, ALICE, fixtures.h264AacMp4());
  const job = { sourceVideoId: result._id, status: "processing" };
  repos.jobs.push(job);
  await rejectsWith(service.deleteVideo(ALICE, result._id), "video_in_use");
  job.status = "completed";
  await service.deleteVideo(ALICE, result._id);
});

test("REQ-VID-LIB-062 (FA7): dismissing a rejected notice removes it from the panel", { skip: ffmpegMissing }, async () => {
  const { service } = setup();
  const { result } = await upload(service, ALICE, fixtures.mpeg4Mp4());
  await service.dismissRejected(ALICE, result._id);
  assert.equal((await service.getLibrary(ALICE)).recent.length, 0);
});

test("FA7: only rejected videos can be dismissed", { skip: ffmpegMissing }, async () => {
  const { service } = setup();
  const { result } = await upload(service, ALICE, fixtures.h264AacMp4());
  await rejectsWith(service.dismissRejected(ALICE, result._id), "not_rejected");
});

// ------------------------------------------------------- isolation (RN3)

test("REQ-VID-LIB-032/033: another user cannot read, cancel or delete my video (403)", { skip: ffmpegMissing }, async () => {
  const { service } = setup();
  const { result } = await upload(service, ALICE, fixtures.h264AacMp4());
  for (const op of [
    () => service.getVideo(BOB, result._id),
    () => service.deleteVideo(BOB, result._id),
    () => service.cancelUpload(BOB, result._id),
  ]) {
    await assert.rejects(op(), (e) => e.status === 403);
  }
  assert.equal((await service.getLibrary(BOB)).videos.length, 0);
});

// ------------------------------------------------------------------ quota

test("REQ-VID-LIB-034: library operations only read the profile, never the operations quota", { skip: ffmpegMissing }, async () => {
  const { service, profiles } = setup();
  const { result } = await upload(service, ALICE, fixtures.h264AacMp4());
  await service.getLibrary(ALICE);
  await service.deleteVideo(ALICE, result._id);
  // the only dependency on the users service is the profile lookup
  assert.ok(profiles.calls.every((id) => id === ALICE));
  assert.deepEqual(Object.keys(profiles).sort(), ["calls", "getUserType"]);
});

// ------------------------------------------------------- account deletion

test("RN13: deleting the account removes all of the user's videos, files and jobs", { skip: ffmpegMissing }, async () => {
  const { service, repos, storage, tmpDir } = setup();
  const ok = await upload(service, ALICE, fixtures.h264AacMp4());
  await upload(service, ALICE, fixtures.mpeg4Mp4()); // rejected
  await service.createUpload(ALICE, { fileName: "pending.mp4", sizeBytes: 10 }); // uploading
  const bobs = await upload(service, BOB, fixtures.h264AacMp4());
  repos.jobs.push({ userId: ALICE, sourceVideoId: ok.result._id, status: "queued" });

  assert.equal(await service.deleteAllForUser(ALICE), 3);
  assert.equal([...repos.videos.values()].filter((v) => v.userId === ALICE).length, 0);
  assert.ok(!storage.objects.has(`${ALICE}/videos/${ok.result._id}.mp4`));
  assert.equal(repos.jobs.length, 0);
  assert.deepEqual(tmpFiles(tmpDir), []);
  // other users are not affected
  assert.equal((await service.getLibrary(BOB)).videos[0]._id, bobs.result._id);
});

test("RN13: an upload in progress is cancelled when the account is deleted", async () => {
  const { service, repos } = setup();
  const created = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 1000 });
  const source = new PassThrough();
  const pending = service.receiveContent(ALICE, created._id, source);
  source.write(Buffer.alloc(100));
  await waitFor(() => service.activeUploads.has(created._id));
  await service.deleteAllForUser(ALICE);
  await rejectsWith(pending, "upload_cancelled");
  assert.equal(repos.videos.size, 0);
});

// ------------------------------------------------------------ maintenance

test("Garantia Mínima: restart cleanup removes interrupted uploads and validations", async () => {
  const { service, repos, tmpDir } = setup();
  const a = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 10 });
  const b = await service.createUpload(ALICE, { fileName: "b.mp4", sizeBytes: 10 });
  await repos.videoRepository.update(b._id, { status: "validating" });
  fs.writeFileSync(path.join(tmpDir, `${a._id}.upload`), "partial");
  assert.equal(await service.sweepOrphans({ olderThanMs: 0 }), 2);
  assert.equal(repos.videos.size, 0);
  assert.deepEqual(tmpFiles(tmpDir), []);
});

test("periodic sweep keeps recent uploads and in-flight validations", async () => {
  const { service, repos } = setup();
  const a = await service.createUpload(ALICE, { fileName: "a.mp4", sizeBytes: 10 });
  await repos.videoRepository.update(a._id, { status: "validating" });
  await service.createUpload(ALICE, { fileName: "b.mp4", sizeBytes: 10 });
  assert.equal(await service.sweepOrphans({ olderThanMs: 30 * 60 * 1000 }), 0);
  assert.equal(repos.videos.size, 2);
});
