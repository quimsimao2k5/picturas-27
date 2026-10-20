// Playback parameters - UC-VID-003 RN2, RN6 and A5 (team decisions).
// All values can be overridden through environment variables.

function num(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

// RN6: maximum simultaneous streams per profile ("free" = Registered).
const STREAM_LIMITS = {
  free: num("PLAYBACK_FREE_MAX_STREAMS", 1),
  premium: num("PLAYBACK_PREMIUM_MAX_STREAMS", 3),
};

const PLAYBACK = {
  // RN2 / REQ-VID-PLAY-037: signed URL lifetime, at most 30 min in the MVP.
  urlTtlSec: Math.min(num("PLAYBACK_URL_TTL_SEC", 1800), 1800),
  // RN6 / A5: the player signals activity every 15 s; a stream without a
  // signal for 45 s stops counting for the limit (REQ-VID-PLAY-055).
  heartbeatIntervalSec: num("PLAYBACK_HEARTBEAT_SEC", 15),
  leaseSec: num("PLAYBACK_LEASE_SEC", 45),
};

/** Max streams of a profile, or null when the profile cannot play videos (RN5). */
function streamLimitFor(userType) {
  return STREAM_LIMITS[userType] ?? null;
}

module.exports = { STREAM_LIMITS, PLAYBACK, streamLimitFor };
