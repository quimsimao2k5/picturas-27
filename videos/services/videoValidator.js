// Technical validation of an uploaded video - UC-VID-002 steps 6 and 7.
// Pure function over the probe result, so the rules are unit-tested without
// depending on FFmpeg.
//
// Step 6: integrity (E7), video codec H.264 (E5), audio codec AAC (E6),
//         plus the real container (E2 rule applied to the file contents).
// Step 7: duration (E8) and resolution (E9) against the profile limits.

const { REJECTION } = require("../utils/status");

const SUPPORTED_VIDEO_CODEC = "h264"; // RN5
const SUPPORTED_AUDIO_CODEC = "aac"; // RN6
const SUPPORTED_CONTAINERS = ["mov", "mp4"]; // RN4 (ffprobe reports "mov,mp4,m4a,3gp,3g2,mj2")

function reject(code, details) {
  return { ok: false, rejection: { code, details: details || {} } };
}

function rotationOf(stream) {
  const fromSideData = (stream.side_data_list || []).find((s) => s.rotation !== undefined);
  const raw = fromSideData ? fromSideData.rotation : stream.tags?.rotate;
  const value = Number(raw);
  return Number.isFinite(value) ? Math.abs(value) % 360 : 0;
}

/**
 * @param {{ok: boolean, data: object|null, errors: string}} probeResult
 * @param {object} limits  profile limits (config/limits.js)
 * @returns {{ok: true, metadata: object} | {ok: false, rejection: {code: string, details: object}}}
 */
function validateProbe(probeResult, limits) {
  // ---- Step 6: integrity (E7 / REQ-VID-LIB-020, REQ-VID-LIB-054) ----
  if (!probeResult || !probeResult.ok || !probeResult.data?.format) {
    return reject(REJECTION.CORRUPTED);
  }
  if (probeResult.errors) {
    // ffprobe ran with "-v error": anything on stderr is a demuxing error.
    return reject(REJECTION.CORRUPTED);
  }

  const { format, streams = [] } = probeResult.data;

  const containers = String(format.format_name || "").split(",");
  if (!SUPPORTED_CONTAINERS.some((c) => containers.includes(c))) {
    return reject(REJECTION.UNSUPPORTED_FORMAT, { accepted: ["MP4", "MOV"] });
  }

  // Cover art is exposed as a video stream with disposition.attached_pic=1.
  const videoStreams = streams.filter(
    (s) => s.codec_type === "video" && s.disposition?.attached_pic !== 1,
  );
  const audioStreams = streams.filter((s) => s.codec_type === "audio");

  if (videoStreams.length === 0) {
    return reject(REJECTION.CORRUPTED);
  }

  // E5 / REQ-VID-LIB-051, REQ-VID-LIB-036
  const badVideo = videoStreams.find((s) => s.codec_name !== SUPPORTED_VIDEO_CODEC);
  if (badVideo) {
    return reject(REJECTION.UNSUPPORTED_VIDEO_CODEC, {
      found: badVideo.codec_name || "unknown",
      accepted: ["H.264"],
    });
  }

  // E6 / REQ-VID-LIB-052, REQ-VID-LIB-053 (videos without audio are accepted)
  const badAudio = audioStreams.find((s) => s.codec_name !== SUPPORTED_AUDIO_CODEC);
  if (badAudio) {
    return reject(REJECTION.UNSUPPORTED_AUDIO_CODEC, {
      found: badAudio.codec_name || "unknown",
      accepted: ["AAC"],
    });
  }

  const main = videoStreams[0];
  const packets = Number(main.nb_read_packets);
  const width = Number(main.width);
  const height = Number(main.height);
  const duration = Number(format.duration ?? main.duration);

  if (
    !(packets > 0) ||
    !(width > 0) ||
    !(height > 0) ||
    !Number.isFinite(duration) ||
    duration <= 0
  ) {
    return reject(REJECTION.CORRUPTED);
  }

  // ---- Step 7: duration (E8 / REQ-VID-LIB-016, REQ-VID-LIB-047) ----
  if (duration > limits.maxDurationSec) {
    return reject(REJECTION.DURATION_EXCEEDED, {
      limitSec: limits.maxDurationSec,
      durationSec: round2(duration),
    });
  }

  // Displayed size: swap when the stream is rotated by 90/270 degrees.
  const rotation = rotationOf(main);
  const rotated = rotation === 90 || rotation === 270;
  const displayWidth = rotated ? height : width;
  const displayHeight = rotated ? width : height;

  // ---- Step 7: resolution, independent of orientation (E9 / REQ-VID-LIB-055, RN10) ----
  const longSide = Math.max(width, height);
  const shortSide = Math.min(width, height);
  if (longSide > limits.maxLongSide || shortSide > limits.maxShortSide) {
    return reject(REJECTION.RESOLUTION_EXCEEDED, {
      limitLabel: limits.resolutionLabel,
      limitLongSide: limits.maxLongSide,
      limitShortSide: limits.maxShortSide,
      width: displayWidth,
      height: displayHeight,
    });
  }

  return {
    ok: true,
    metadata: {
      // REQ-VID-LIB-022 / 023
      durationSec: round2(duration),
      width: displayWidth,
      height: displayHeight,
      videoCodec: SUPPORTED_VIDEO_CODEC,
      audioCodec: audioStreams.length ? SUPPORTED_AUDIO_CODEC : null,
      container: String(format.format_name || ""),
    },
  };
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { validateProbe };
