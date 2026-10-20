// MongoDB implementation of the repositories used by VideoLibraryService.
// The service only depends on the method names below, which lets the tests
// use an in-memory implementation (test/helpers/memoryRepositories.js).

const Video = require("../models/video");
const Job = require("../models/job");
const PlaybackSession = require("../models/playbackSession");
const SecurityEvent = require("../models/securityEvent");
const { ACTIVE_JOB_STATUSES } = require("../utils/status");

function plain(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : doc;
  return { ...obj, _id: String(obj._id) };
}

const videoRepository = {
  async create(data) {
    return plain(await Video.create(data));
  },
  async findById(id) {
    if (!Video.base.isValidObjectId(id)) return null;
    return plain(await Video.findById(id).lean());
  },
  async update(id, patch) {
    return plain(await Video.findByIdAndUpdate(id, patch, { new: true }).lean());
  },
  async delete(id) {
    await Video.deleteOne({ _id: id });
  },
  async listByUser(userId, statuses) {
    const docs = await Video.find({ userId, status: { $in: statuses } })
      .sort({ createdAt: -1 })
      .lean();
    return docs.map(plain);
  },
  async sumSize(userId, statuses) {
    const [row] = await Video.aggregate([
      { $match: { userId, status: { $in: statuses } } },
      { $group: { _id: null, total: { $sum: "$sizeBytes" } } },
    ]);
    return row ? row.total : 0;
  },
  async findByStatuses(statuses, { createdBefore } = {}) {
    const query = { status: { $in: statuses } };
    if (createdBefore) query.createdAt = { $lt: createdBefore };
    return (await Video.find(query).lean()).map(plain);
  },
};

const jobRepository = {
  async hasActiveForVideo(videoId) {
    return !!(await Job.exists({
      sourceVideoId: String(videoId),
      status: { $in: ACTIVE_JOB_STATUSES },
    }));
  },
  async deleteByUser(userId) {
    await Job.deleteMany({ userId });
  },
  // UC-VID-001 - processing requests
  async create(data) {
    return plain(await Job.create(data));
  },
  async findById(id) {
    if (!Job.base.isValidObjectId(id)) return null;
    return plain(await Job.findById(id).lean());
  },
  async update(id, patch) {
    return plain(await Job.findByIdAndUpdate(id, patch, { new: true }).lean());
  },
  async listByUser(userId, limit = 20) {
    return (await Job.find({ userId }).sort({ createdAt: -1 }).limit(limit).lean()).map(plain);
  },
  async listActiveByUser(userId) {
    return (await Job.find({ userId, status: { $in: ACTIVE_JOB_STATUSES } }).lean()).map(plain);
  },
  async nextQueued(excludeIds = []) {
    return plain(
      await Job.findOne({ status: "queued", _id: { $nin: excludeIds } }).sort({ createdAt: 1 }).lean(),
    );
  },
  async findByStatus(status) {
    return (await Job.find({ status }).lean()).map(plain);
  },
};

// UC-VID-003 - active streams (RN6)
const playbackSessionRepository = {
  async create(data) {
    return plain(await PlaybackSession.create(data));
  },
  async findById(id) {
    if (!PlaybackSession.base.isValidObjectId(id)) return null;
    return plain(await PlaybackSession.findById(id).lean());
  },
  async touch(id, at) {
    await PlaybackSession.updateOne({ _id: id }, { lastSeenAt: at });
  },
  async delete(id) {
    await PlaybackSession.deleteOne({ _id: id });
  },
  async deleteByClient(userId, clientId) {
    await PlaybackSession.deleteMany({ userId, clientId });
  },
  async countActive(userId, since) {
    return PlaybackSession.countDocuments({ userId, lastSeenAt: { $gte: since } });
  },
  async deleteByUser(userId) {
    await PlaybackSession.deleteMany({ userId });
  },
};

// UC-VID-003 - security audit (REQ-VID-PLAY-054)
const securityEventRepository = {
  async record(event) {
    await SecurityEvent.create(event);
  },
};

module.exports = { videoRepository, jobRepository, playbackSessionRepository, securityEventRepository };
