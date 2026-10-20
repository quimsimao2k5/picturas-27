// PictuRAS - Video microservice: library (UC-VID-002), playback (UC-VID-003)
// and processing / trim (UC-VID-001).
// Express + own MongoDB + SeaweedFS S3 + ffprobe.

const express = require("express");
const logger = require("morgan");
const mongoose = require("mongoose");
const os = require("os");
const path = require("path");

const { VideoLibraryService } = require("./services/videoLibraryService");
const {
  videoRepository,
  jobRepository,
  playbackSessionRepository,
  securityEventRepository,
} = require("./repositories/mongoRepositories");
const { PlaybackService } = require("./services/playbackService");
const { ProcessingService } = require("./services/processingService");
const { quotaClient } = require("./services/quotaClient");
const { objectStorage } = require("./services/objectStorage");
const mediaProbe = require("./services/mediaProbe");
const { userProfiles } = require("./services/userProfiles");
const { AppError } = require("./utils/errors");
const videosRouter = require("./routes/videos");

const MONGO_URL = process.env.MONGO_URL || "mongodb://videos_mongoDB:27020/videos";
const TMP_DIR = process.env.VIDEO_TMP_DIR || path.join(os.tmpdir(), "picturas-videos");
// Uploads whose content never arrives are discarded after this period.
const ORPHAN_UPLOAD_MS = Number(process.env.VIDEO_ORPHAN_UPLOAD_MS) || 30 * 60 * 1000;

const service = new VideoLibraryService({
  videoRepository,
  jobRepository,
  objectStorage,
  mediaProbe,
  userProfiles,
  tmpDir: TMP_DIR,
});

// UC-VID-003 - video playback
const playback = new PlaybackService({
  videoRepository,
  sessionRepository: playbackSessionRepository,
  securityEvents: securityEventRepository,
  objectStorage,
  userProfiles,
});

// UC-VID-001 - video processing (trim)
const processing = new ProcessingService({
  videoRepository,
  jobRepository,
  objectStorage,
  mediaProbe,
  userProfiles,
  quota: quotaClient,
  tmpDir: TMP_DIR,
});

mongoose.connect(MONGO_URL);
const db = mongoose.connection;
db.on("error", console.error.bind(console, "Error connecting to MongoDB"));
db.once("open", async () => {
  console.log("MongoDB connection successful");
  try {
    // Nothing can be running right after a (re)start: clean everything left
    // in "uploading"/"validating" by a previous process.
    const removed = await service.sweepOrphans({ olderThanMs: 0 });
    if (removed) console.log(`[videos] removed ${removed} interrupted upload(s)`);
  } catch (err) {
    console.error("[videos] startup cleanup failed", err);
  }
  try {
    await processing.recover(); // requests interrupted by a restart go back to the queue
  } catch (err) {
    console.error("[videos] processing recovery failed", err);
  }
  setInterval(() => {
    service
      .sweepOrphans({ olderThanMs: ORPHAN_UPLOAD_MS })
      .catch((err) => console.error("[videos] orphan sweep failed", err));
  }, 5 * 60 * 1000).unref();
});

const app = express();
app.use(logger("dev"));

app.use("/", videosRouter(service, playback, processing));

app.use((req, res) => {
  res.status(404).json({ code: "not_found", message: "Not found" });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.code, message: err.message, details: err.details });
  }
  console.error("[videos] unexpected error", err);
  res.status(500).json({ code: "internal_error", message: "Unexpected error" });
});

module.exports = app;
