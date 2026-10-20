// Component tests of UC-VID-003 (PlaybackService) with in-memory doubles.
// The available videos are created directly in the repository (as the
// library would leave them after step 8 of UC-VID-002).
const test = require("node:test");
const assert = require("node:assert/strict");

const { PlaybackService } = require("../services/playbackService");
const { PLAYBACK } = require("../config/playback");
const {
  createMemoryRepositories,
  createFakeStorage,
  createFakeProfiles,
  createPlaybackRepositories,
} = require("./helpers/memoryRepositories");

const ALICE = "aaaaaaaaaaaaaaaaaaaaaaaa"; // Registered (1 stream)
const BOB = "bbbbbbbbbbbbbbbbbbbbbbbb"; // Premium (3 streams)
const ANON = "cccccccccccccccccccccccc";

async function setup() {
  const repos = createMemoryRepositories();
  const playbackRepos = createPlaybackRepositories();
  const storage = createFakeStorage();
  const profiles = createFakeProfiles({ [ALICE]: "free", [BOB]: "premium", [ANON]: "anonymous" });
  let clock = Date.parse("2026-10-18T12:00:00Z");
  const service = new PlaybackService({
    videoRepository: repos.videoRepository,
    sessionRepository: playbackRepos.sessionRepository,
    securityEvents: playbackRepos.securityEvents,
    objectStorage: storage,
    userProfiles: profiles,
    now: () => clock,
    logger: { warn() {}, error() {} },
  });

  async function addVideo(userId, extra = {}) {
    const video = await repos.videoRepository.create({
      userId,
      name: "clip.mp4",
      format: "mp4",
      mimeType: "video/mp4",
      sizeBytes: 1000,
      status: "available",
      durationSec: 10,
      width: 320,
      height: 240,
      ...extra,
    });
    const storageKey = `videos/${video._id}.${video.format}`;
    await repos.videoRepository.update(video._id, { storageKey });
    if (video.status === "available") storage.objects.set(`${userId}/${storageKey}`, { size: video.sizeBytes });
    return { ...video, storageKey };
  }

  return {
    service, repos, playbackRepos, storage, profiles, addVideo,
    advance: (sec) => (clock += sec * 1000),
  };
}

const rejectsWith = (promise, status, code) =>
  assert.rejects(promise, (err) => {
    assert.equal(err.code, code);
    assert.equal(err.status, status);
    return true;
  });

// ------------------------------------------------------------- step 2

test("REQ-VID-PLAY-001/003/005: owner of an available video gets a signed URL", async () => {
  const { service, addVideo } = await setup();
  const video = await addVideo(ALICE);
  const result = await service.start(ALICE, video._id, { clientId: "browser-1" });
  assert.match(result.url, /^https:\/\/storage\.test\/user-a+\/videos\//);
  assert.ok(result.sessionId);
  assert.equal(result.video._id, video._id);
  assert.equal(result.heartbeatIntervalSec, 15);
});

test("REQ-VID-PLAY-037: signed URL lifetime is at most 30 minutes", async () => {
  const { service, storage, addVideo } = await setup();
  const video = await addVideo(ALICE);
  const result = await service.start(ALICE, video._id);
  const presign = storage.calls.find((c) => c[0] === "presign");
  assert.ok(presign[3] <= 1800);
  assert.equal(Date.parse(result.expiresAt) - Date.parse("2026-10-18T12:00:00Z"), presign[3] * 1000);
  assert.ok(PLAYBACK.urlTtlSec <= 1800);
});

test("REQ-VID-PLAY-005: signed URL carries no extra response-* parameters (same shape as images)", async () => {
  const { service, storage, addVideo } = await setup();
  const video = await addVideo(ALICE, { format: "mov", mimeType: "video/quicktime" });
  await service.start(ALICE, video._id);
  assert.equal(storage.calls.find((c) => c[0] === "presign").length, 4); // userId, key, ttl only
});

test("REQ-VID-PLAY-030/054 (E5): anonymous user refused and audited, no URL issued", async () => {
  const { service, storage, playbackRepos, addVideo } = await setup();
  const video = await addVideo(ANON);
  await rejectsWith(service.start(ANON, video._id), 403, "anonymous_not_allowed");
  assert.equal(storage.calls.filter((c) => c[0] === "presign").length, 0);
  assert.equal(playbackRepos.events[0].reason, "anonymous");
});

test("REQ-VID-PLAY-029/054 (E5): another user is refused and the attempt is audited", async () => {
  const { service, playbackRepos, addVideo } = await setup();
  const video = await addVideo(ALICE);
  await rejectsWith(service.start(BOB, video._id, { ip: "10.0.0.7" }), 403, "forbidden");
  assert.deepEqual(
    [playbackRepos.events[0].reason, playbackRepos.events[0].userId, playbackRepos.events[0].videoId, playbackRepos.events[0].ip],
    ["not_owner", BOB, video._id, "10.0.0.7"],
  );
});

test("REQ-VID-PLAY-004/022 (E4): deleted video cannot be played", async () => {
  const { service, repos, addVideo } = await setup();
  const video = await addVideo(ALICE);
  await repos.videoRepository.delete(video._id);
  await rejectsWith(service.start(ALICE, video._id), 404, "video_unavailable");
});

test("REQ-VID-PLAY-004 (E4): video that is not 'available' cannot be played", async () => {
  const { service, addVideo } = await setup();
  for (const status of ["uploading", "validating", "rejected"]) {
    const video = await addVideo(ALICE, { status });
    await rejectsWith(service.start(ALICE, video._id), 404, "video_unavailable");
  }
});

test("REQ-VID-PLAY-004 (E4): record exists but the stored file is gone", async () => {
  const { service, storage, addVideo } = await setup();
  const video = await addVideo(ALICE);
  storage.objects.clear();
  await rejectsWith(service.start(ALICE, video._id), 404, "video_unavailable");
});

test("E6: stored file with a size different from the registered one is corrupted", async () => {
  const { service, storage, addVideo } = await setup();
  const video = await addVideo(ALICE);
  storage.objects.set(`${ALICE}/${video.storageKey}`, { size: 400 });
  await rejectsWith(service.start(ALICE, video._id), 422, "video_corrupted");
});

// ------------------------------------------------------ RN6 / E7 limits

test("REQ-VID-PLAY-039 (E7): Registered limited to 1 simultaneous stream", async () => {
  const { service, addVideo } = await setup();
  const a = await addVideo(ALICE);
  const b = await addVideo(ALICE);
  await service.start(ALICE, a._id, { clientId: "laptop" });
  await assert.rejects(service.start(ALICE, b._id, { clientId: "phone" }), (e) => {
    assert.equal(e.code, "stream_limit_reached");
    assert.equal(e.status, 429);
    assert.equal(e.details.limit, 1);
    return true;
  });
});

test("REQ-VID-PLAY-039 (E7): Premium limited to 3 simultaneous streams", async () => {
  const { service, addVideo } = await setup();
  const v = await addVideo(BOB);
  for (const c of ["d1", "d2", "d3"]) await service.start(BOB, v._id, { clientId: c });
  await rejectsWith(service.start(BOB, v._id, { clientId: "d4" }), 429, "stream_limit_reached");
});

test("REQ-VID-PLAY-055: closing the player releases the stream", async () => {
  const { service, addVideo } = await setup();
  const v = await addVideo(ALICE);
  const first = await service.start(ALICE, v._id, { clientId: "laptop" });
  await service.stop(ALICE, first.sessionId);
  assert.ok(await service.start(ALICE, v._id, { clientId: "phone" }));
});

test("REQ-VID-PLAY-055: a player without heartbeat for 45 s stops counting", async () => {
  const { service, advance, addVideo } = await setup();
  const v = await addVideo(ALICE);
  await service.start(ALICE, v._id, { clientId: "laptop" });
  advance(44);
  await rejectsWith(service.start(ALICE, v._id, { clientId: "phone" }), 429, "stream_limit_reached");
  advance(2);
  assert.ok(await service.start(ALICE, v._id, { clientId: "phone" }));
});

test("REQ-VID-PLAY-055: heartbeats keep the stream active beyond 45 s", async () => {
  const { service, advance, addVideo } = await setup();
  const v = await addVideo(ALICE);
  const s = await service.start(ALICE, v._id, { clientId: "laptop" });
  for (let i = 0; i < 6; i++) {
    advance(15);
    await service.heartbeat(ALICE, s.sessionId);
  }
  await rejectsWith(service.start(ALICE, v._id, { clientId: "phone" }), 429, "stream_limit_reached");
});

test("REQ-VID-PLAY-056 / 048: same browser reclaims its stream right after an abrupt close", async () => {
  const { service, addVideo } = await setup();
  const v = await addVideo(ALICE);
  const old = await service.start(ALICE, v._id, { clientId: "laptop" }); // browser killed, no stop()
  const again = await service.start(ALICE, v._id, { clientId: "laptop" });
  assert.notEqual(again.sessionId, old.sessionId);
  // the replaced player is told its session ended
  await rejectsWith(service.heartbeat(ALICE, old.sessionId), 410, "playback_session_ended");
});

// ---------------------------------------------------------- E3a / E3b

test("REQ-VID-PLAY-021 (E3a): renewing issues a new signed URL", async () => {
  const { service, advance, addVideo } = await setup();
  const v = await addVideo(ALICE);
  const s = await service.start(ALICE, v._id);
  advance(10);
  const renewed = await service.renew(ALICE, s.sessionId);
  assert.notEqual(renewed.url, s.url);
  assert.ok(Date.parse(renewed.expiresAt) > Date.parse(s.expiresAt));
});

test("REQ-VID-PLAY-022 (E4 during playback): renew detects a video deleted in another tab", async () => {
  const { service, repos, addVideo } = await setup();
  const v = await addVideo(ALICE);
  const s = await service.start(ALICE, v._id);
  await repos.videoRepository.delete(v._id);
  await rejectsWith(service.renew(ALICE, s.sessionId), 404, "video_unavailable");
});

test("renew/heartbeat of an ended or foreign session -> 410", async () => {
  const { service, advance, addVideo } = await setup();
  const v = await addVideo(ALICE);
  const s = await service.start(ALICE, v._id);
  await rejectsWith(service.heartbeat(BOB, s.sessionId), 410, "playback_session_ended");
  advance(60);
  await rejectsWith(service.renew(ALICE, s.sessionId), 410, "playback_session_ended");
});

// ------------------------------------------------------- RN3 / read-only

test("REQ-VID-PLAY-028/032: playback reads only the profile and never changes the video", async () => {
  const { service, repos, profiles, addVideo } = await setup();
  const v = await addVideo(ALICE);
  const before = JSON.stringify(await repos.videoRepository.findById(v._id));
  const s = await service.start(ALICE, v._id);
  await service.heartbeat(ALICE, s.sessionId);
  await service.renew(ALICE, s.sessionId);
  await service.stop(ALICE, s.sessionId);
  assert.equal(JSON.stringify(await repos.videoRepository.findById(v._id)), before);
  assert.deepEqual(Object.keys(profiles).sort(), ["calls", "getUserType"]);
});

test("account deletion removes the user's playback sessions", async () => {
  const { service, playbackRepos, addVideo } = await setup();
  const v = await addVideo(BOB);
  await service.start(BOB, v._id, { clientId: "a" });
  await service.start(BOB, v._id, { clientId: "b" });
  await service.deleteAllForUser(BOB);
  assert.equal(playbackRepos.sessions.size, 0);
});
