// Use-case orchestration of UC-VID-003 - "Reproduzir Vídeo".
//
// The video bytes never go through this service: step 2 validates the
// request and issues a temporary signed URL (RN2), and the browser streams
// the file directly from the object store with Range requests (A1, DQ1).
// This service also keeps a "playback session" per open player so the
// simultaneous-stream limit of RN6 can be enforced:
//   start     -> step 2 (ownership, status, file check, stream limit, signed URL)
//   heartbeat -> the player signals activity every 15 s (REQ-VID-PLAY-055)
//   renew     -> E3a: new signed URL while the session is valid
//   stop      -> step 5 / FA3: the stream is released
// Playback never touches the daily operations quota (RN3, REQ-VID-PLAY-028)
// nor changes the video (REQ-VID-PLAY-032).

const { AppError } = require("../utils/errors");
const { VIDEO_STATUS } = require("../utils/status");
const { PLAYBACK, streamLimitFor } = require("../config/playback");
const { toPublic } = require("./videoLibraryService");

const MAX_CLIENT_ID = 100;

class PlaybackService {
  constructor({
    videoRepository,
    sessionRepository,
    securityEvents,
    objectStorage,
    userProfiles,
    limitsFor = streamLimitFor,
    config = PLAYBACK,
    now = () => Date.now(),
    logger = console,
  }) {
    this.videos = videoRepository;
    this.sessions = sessionRepository;
    this.audit = securityEvents;
    this.storage = objectStorage;
    this.profiles = userProfiles;
    this.limitsFor = limitsFor;
    this.config = config;
    this.now = now;
    this.log = logger;
  }

  // ---------------------------------------------------------------- helpers

  /** REQ-VID-PLAY-054: every refused attempt is persisted for auditing. */
  async recordDenied(reason, userId, videoId, ip) {
    const event = { type: "playback_denied", reason, userId, videoId, ip, at: new Date(this.now()) };
    this.log.warn?.(`[SECURITY] ${JSON.stringify(event)}`);
    try {
      await this.audit.record(event);
    } catch (err) {
      this.log.error("[videos] could not persist security event", err);
    }
  }

  /**
   * Step 2 checks shared by start and renew:
   *  - RN5 / E5: Registered or Premium only (REQ-VID-PLAY-030)
   *  - RN4 / E5: owner only (REQ-VID-PLAY-029)
   *  - E4: video still exists and is "available" (REQ-VID-PLAY-004, 022)
   *  - E6: stored file exists with the registered size
   */
  async authorize(userId, videoId, ip) {
    const type = await this.profiles.getUserType(userId);
    const maxStreams = this.limitsFor(type);
    if (!maxStreams) {
      await this.recordDenied("anonymous", userId, videoId, ip);
      throw new AppError(403, "anonymous_not_allowed", "Video playback requires a registered account.");
    }

    const video = await this.videos.findById(videoId);
    if (!video) {
      throw new AppError(404, "video_unavailable", "The video is no longer available.");
    }
    if (video.userId !== userId) {
      await this.recordDenied("not_owner", userId, videoId, ip);
      throw new AppError(403, "forbidden", "You do not have permission to access this video.");
    }
    if (video.status !== VIDEO_STATUS.AVAILABLE) {
      throw new AppError(404, "video_unavailable", "The video is not available.", { status: video.status });
    }

    const stored = await this.storage.head(userId, video.storageKey).catch((err) => {
      this.log.error("[videos] storage head failed", err);
      throw new AppError(503, "storage_unavailable", "The video storage is not reachable.");
    });
    if (!stored) {
      throw new AppError(404, "video_unavailable", "The video is no longer available.");
    }
    if (stored.size !== video.sizeBytes) {
      throw new AppError(422, "video_corrupted", "The video file is corrupted or incomplete.");
    }

    return { video, type, maxStreams };
  }

  async signedUrl(video) {
    const ttl = this.config.urlTtlSec;
    const url = await this.storage.presignGet(video.userId, video.storageKey, ttl);
    return { url, expiresAt: new Date(this.now() + ttl * 1000).toISOString() };
  }

  activeSince() {
    return new Date(this.now() - this.config.leaseSec * 1000);
  }

  async getOwnSession(userId, sessionId) {
    const session = await this.sessions.findById(sessionId);
    if (!session || session.userId !== userId || new Date(session.lastSeenAt) < this.activeSince()) {
      throw new AppError(410, "playback_session_ended", "This playback session has ended.");
    }
    return session;
  }

  // ------------------------------------------------------------------ step 2

  /**
   * Starts a playback: REQ-VID-PLAY-003, 004, 005, 029, 030, 039, 056.
   * @param {{clientId?: string, ip?: string}} context
   */
  async start(userId, videoId, { clientId, ip } = {}) {
    const { video, type, maxStreams } = await this.authorize(userId, videoId, ip);
    const client = typeof clientId === "string" && clientId.length <= MAX_CLIENT_ID ? clientId : undefined;

    // REQ-VID-PLAY-056: a new playback from the same browser replaces that
    // browser's previous sessions (e.g. left behind by an abrupt close).
    if (client) await this.sessions.deleteByClient(userId, client);

    // E7 / RN6 / REQ-VID-PLAY-039
    const active = await this.sessions.countActive(userId, this.activeSince());
    if (active >= maxStreams) {
      throw new AppError(429, "stream_limit_reached", "You reached the maximum number of simultaneous streams of your plan.", {
        limit: maxStreams,
        profile: type,
      });
    }

    const session = await this.sessions.create({
      userId,
      videoId: String(video._id),
      clientId: client,
      lastSeenAt: new Date(this.now()),
    });

    return {
      sessionId: String(session._id),
      ...(await this.signedUrl(video)),
      heartbeatIntervalSec: this.config.heartbeatIntervalSec,
      video: toPublic(video),
    };
  }

  // -------------------------------------------------------------- heartbeat

  /** REQ-VID-PLAY-055: keeps the stream counted while the player is open. */
  async heartbeat(userId, sessionId) {
    await this.getOwnSession(userId, sessionId);
    await this.sessions.touch(sessionId, new Date(this.now()));
  }

  // -------------------------------------------------------------------- E3a

  /**
   * E3a / REQ-VID-PLAY-021: a new signed URL while the user session is valid
   * (E3b - an expired JWT is refused by the gateway before reaching here).
   * Re-checks the video, so a deletion in another tab is detected (E4).
   */
  async renew(userId, sessionId, { ip } = {}) {
    const session = await this.getOwnSession(userId, sessionId);
    const { video } = await this.authorize(userId, session.videoId, ip);
    await this.sessions.touch(sessionId, new Date(this.now()));
    return this.signedUrl(video);
  }

  // ------------------------------------------------------ download (UC-VID-001)

  /**
   * REQ-VID-TRIM-025: signed URL to download a video. Same checks as playback
   * (owner, available, file present); no stream session is created. The
   * file name is given to the browser by the page (same-origin "download").
   */
  async downloadUrl(userId, videoId, { ip } = {}) {
    const { video } = await this.authorize(userId, videoId, ip);
    const signed = await this.signedUrl(video);
    const hasExt = /\.(mp4|mov)$/i.test(video.name);
    return { ...signed, fileName: hasExt ? video.name : `${video.name}.${video.format}` };
  }

  // ----------------------------------------------------------- step 5 / FA3

  /** Releases the stream (REQ-VID-PLAY-055). Idempotent. */
  async stop(userId, sessionId) {
    const session = await this.sessions.findById(sessionId);
    if (session && session.userId === userId) await this.sessions.delete(sessionId);
  }

  /** Account deletion (RN13 of UC-VID-002). */
  async deleteAllForUser(userId) {
    await this.sessions.deleteByUser(userId);
  }
}

module.exports = { PlaybackService };
