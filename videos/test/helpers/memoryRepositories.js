// In-memory doubles of the repositories, storage and users service used by
// the VideoLibraryService tests.
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { ACTIVE_JOB_STATUSES } = require("../../utils/status");

function createMemoryRepositories() {
  const videos = new Map();
  const jobs = [];
  let clock = 0;

  const videoRepository = {
    async create(data) {
      const _id = crypto.randomBytes(12).toString("hex");
      const doc = { ...data, _id, createdAt: new Date(Date.now() + clock++) };
      videos.set(_id, doc);
      return { ...doc };
    },
    async findById(id) {
      const doc = videos.get(id);
      return doc ? { ...doc } : null;
    },
    async update(id, patch) {
      const doc = videos.get(id);
      if (!doc) return null;
      Object.assign(doc, patch);
      return { ...doc };
    },
    async delete(id) {
      videos.delete(id);
    },
    async listByUser(userId, statuses) {
      return [...videos.values()]
        .filter((v) => v.userId === userId && statuses.includes(v.status))
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((v) => ({ ...v }));
    },
    async sumSize(userId, statuses) {
      return [...videos.values()]
        .filter((v) => v.userId === userId && statuses.includes(v.status))
        .reduce((acc, v) => acc + v.sizeBytes, 0);
    },
    async findByStatuses(statuses, { createdBefore } = {}) {
      return [...videos.values()]
        .filter((v) => statuses.includes(v.status))
        .filter((v) => !createdBefore || v.createdAt < createdBefore)
        .map((v) => ({ ...v }));
    },
  };

  const jobRepository = {
    // UC-VID-001
    async create(data) {
      const _id = crypto.randomBytes(12).toString("hex");
      const doc = { ...data, _id, createdAt: new Date(Date.now() + clock++) };
      jobs.push(doc);
      return { ...doc };
    },
    async findById(id) {
      const j = jobs.find((x) => x._id === String(id));
      return j ? { ...j } : null;
    },
    async update(id, patch) {
      const j = jobs.find((x) => x._id === String(id));
      if (!j) return null;
      Object.assign(j, patch);
      return { ...j };
    },
    async listByUser(userId, limit = 20) {
      return jobs.filter((j) => j.userId === userId).sort((a, b) => b.createdAt - a.createdAt).slice(0, limit).map((j) => ({ ...j }));
    },
    async listActiveByUser(userId) {
      return jobs.filter((j) => j.userId === userId && ACTIVE_JOB_STATUSES.includes(j.status)).map((j) => ({ ...j }));
    },
    async nextQueued(excludeIds = []) {
      const j = jobs
        .filter((x) => x.status === "queued" && !excludeIds.includes(x._id))
        .sort((a, b) => a.createdAt - b.createdAt)[0];
      return j ? { ...j } : null;
    },
    async findByStatus(status) {
      return jobs.filter((j) => j.status === status).map((j) => ({ ...j }));
    },
    async hasActiveForVideo(videoId) {
      return jobs.some((j) => j.sourceVideoId === videoId && ACTIVE_JOB_STATUSES.includes(j.status));
    },
    async deleteByUser(userId) {
      for (let i = jobs.length - 1; i >= 0; i--) if (jobs[i].userId === userId) jobs.splice(i, 1);
    },
  };

  return { videoRepository, jobRepository, videos, jobs };
}

function createFakeStorage() {
  const objects = new Map();
  const calls = [];
  let failNextPut = false;
  return {
    objects,
    calls,
    failNextPut() {
      failNextPut = true;
    },
    async put(userId, key, filePath, contentType) {
      calls.push(["put", userId, key, contentType]);
      if (failNextPut) {
        failNextPut = false;
        throw new Error("injected storage failure");
      }
      // keep a copy: the caller removes its temporary file afterwards
      let stored = filePath;
      if (typeof filePath === "string" && fs.existsSync(filePath)) {
        const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fake-s3-"));
        stored = path.join(dir, path.basename(filePath));
        fs.copyFileSync(filePath, stored);
      }
      objects.set(`${userId}/${key}`, stored);
    },
    // UC-VID-001: FFmpeg reads the original from here
    async internalUrl(userId, key) {
      return objects.get(`${userId}/${key}`);
    },
    async remove(userId, key) {
      calls.push(["remove", userId, key]);
      objects.delete(`${userId}/${key}`);
    },
    // UC-VID-003
    async presignGet(userId, key, ttlSec, ...extra) {
      calls.push(["presign", userId, key, ttlSec, ...extra]);
      return `https://storage.test/user-${userId}/${key}?ttl=${ttlSec}&sig=${crypto.randomBytes(4).toString("hex")}`;
    },
    async head(userId, key) {
      const file = objects.get(`${userId}/${key}`);
      if (!file) return null;
      return { size: typeof file === "string" && fs.existsSync(file) ? fs.statSync(file).size : Number(file.size) };
    },
  };
}

// UC-VID-003 doubles
function createPlaybackRepositories() {
  const sessions = new Map();
  const events = [];
  const sessionRepository = {
    async create(data) {
      const _id = crypto.randomBytes(12).toString("hex");
      sessions.set(_id, { ...data, _id });
      return { ...data, _id };
    },
    async findById(id) {
      const s = sessions.get(id);
      return s ? { ...s } : null;
    },
    async touch(id, at) {
      if (sessions.has(id)) sessions.get(id).lastSeenAt = at;
    },
    async delete(id) {
      sessions.delete(id);
    },
    async deleteByClient(userId, clientId) {
      for (const [id, s] of sessions) if (s.userId === userId && s.clientId === clientId) sessions.delete(id);
    },
    async countActive(userId, since) {
      return [...sessions.values()].filter((s) => s.userId === userId && s.lastSeenAt >= since).length;
    },
    async deleteByUser(userId) {
      for (const [id, s] of sessions) if (s.userId === userId) sessions.delete(id);
    },
  };
  const securityEvents = {
    async record(event) {
      events.push(event);
    },
  };
  return { sessionRepository, securityEvents, sessions, events };
}

function createFakeProfiles(types) {
  const calls = [];
  return {
    calls,
    async getUserType(userId) {
      calls.push(userId);
      return types[userId] ?? "anonymous";
    },
  };
}

// UC-VID-001: daily operations quota double (RN3)
function createFakeQuota(remaining) {
  const calls = [];
  return {
    calls,
    remaining,
    async reserve(userId) {
      calls.push(["reserve", userId]);
      if ((this.remaining[userId] ?? Infinity) <= 0) {
        const { AppError } = require("../../utils/errors");
        throw new AppError(429, "daily_quota_exhausted", "limit", { resetAt: "2026-10-19T00:00:00.000Z" });
      }
      if (this.remaining[userId] !== undefined) this.remaining[userId] -= 1;
    },
    async refund(userId) {
      calls.push(["refund", userId]);
      if (this.remaining[userId] !== undefined) this.remaining[userId] += 1;
      return true;
    },
  };
}

module.exports = {
  createMemoryRepositories,
  createFakeStorage,
  createFakeProfiles,
  createPlaybackRepositories,
  createFakeQuota,
};
