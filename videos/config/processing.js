// Video processing parameters - UC-VID-001 RN3, RN4, RN7, RN8 and
// REQ-VID-TRIM-058 (team decisions). Overridable through environment variables.

function num(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const PROCESSING = {
  // REQ-VID-TRIM-058: up to 5 requests processed in parallel (MVP)
  concurrency: num("PROCESSING_CONCURRENCY", 5),
  // RN7: one automatic retry -> at most 2 attempts
  maxAttempts: num("PROCESSING_MAX_ATTEMPTS", 2),
  // RN8: progress refreshed at least every 5 s (written every second)
  progressWriteMs: num("PROCESSING_PROGRESS_WRITE_MS", 1000),
};

// RN4: requests "queued"/"processing" allowed at the same time per profile
const ACTIVE_LIMITS = {
  free: num("PROCESSING_FREE_MAX_ACTIVE", 1),
  premium: num("PROCESSING_PREMIUM_MAX_ACTIVE", 3),
};

function activeLimitFor(userType) {
  return ACTIVE_LIMITS[userType] ?? null;
}

module.exports = { PROCESSING, ACTIVE_LIMITS, activeLimitFor };
