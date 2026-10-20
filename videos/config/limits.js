// Per-profile limits of the video library.
// Source: UC-VID-002 RN10 / A4 (team decision). A4 states that changing the
// limits must only require changing configuration, so every value can be
// overridden through environment variables without touching the validation.
//
// Resolution is checked independently of orientation (RN10, v1.3): the long
// side of the frame is compared with maxLongSide and the short side with
// maxShortSide, so a vertical 1080x1920 video is a valid "1080p" video.

const MiB = 1024 * 1024;
const GiB = 1024 * MiB;

function num(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const LIMITS = {
  // "free" is the existing PictuRAS type for the Registered profile.
  free: {
    maxFileBytes: num("VIDEO_FREE_MAX_FILE_BYTES", 100 * MiB),
    maxDurationSec: num("VIDEO_FREE_MAX_DURATION_SEC", 180),
    maxLongSide: num("VIDEO_FREE_MAX_LONG_SIDE", 1920),
    maxShortSide: num("VIDEO_FREE_MAX_SHORT_SIDE", 1080),
    storageBytes: num("VIDEO_FREE_STORAGE_BYTES", 500 * MiB),
    resolutionLabel: "1080p",
  },
  premium: {
    maxFileBytes: num("VIDEO_PREMIUM_MAX_FILE_BYTES", 1 * GiB),
    maxDurationSec: num("VIDEO_PREMIUM_MAX_DURATION_SEC", 1800),
    maxLongSide: num("VIDEO_PREMIUM_MAX_LONG_SIDE", 3840),
    maxShortSide: num("VIDEO_PREMIUM_MAX_SHORT_SIDE", 2160),
    storageBytes: num("VIDEO_PREMIUM_STORAGE_BYTES", 10 * GiB),
    resolutionLabel: "4K",
  },
};

/**
 * Returns the limits of a profile, or null when the profile has no video
 * library (anonymous - UC-VID-002 RN1).
 */
function limitsFor(userType) {
  return LIMITS[userType] ?? null;
}

module.exports = { LIMITS, limitsFor, MiB, GiB };
