// Trim tool - UC-VID-001. Implements the common video-tool contract used by
// ProcessingService (REQ-VID-TRIM-060 / DQ-004):
//   type, prepare(video, request) -> params, estimateBytes(video, params),
//   expectedDurationSec(params), buildArgs({ input, output, params })
// Adding another video tool means adding another module with this contract;
// this file and ProcessingService do not change.

const { AppError } = require("../../utils/errors");

const OUTPUT_FORMATS = ["mp4", "mov"]; // RN1
const MAX_NAME_LENGTH = 200;

function invalid(reason, details = {}) {
  // E2 / REQ-VID-TRIM-037..041: the reason and the violated limit
  return new AppError(400, "invalid_interval", "The selected interval is not valid.", { reason, ...details });
}

/** Longest selectable end instant (1 s precision - RN2). */
function maxEndSec(video) {
  return Math.max(1, Math.round(Number(video.durationSec) || 0));
}

function baseName(name) {
  return String(name || "video").replace(/\.(mp4|mov)$/i, "");
}

const trimTool = {
  type: "trim",

  /**
   * Validates the request (steps 4-5, E2, FA1) and returns normalised params.
   * @param {object} video   source video (available)
   * @param {{startSec, endSec, outputFormat?, name?, confirmFullCopy?}} request
   */
  prepare(video, request = {}) {
    const startSec = Number(request.startSec);
    const endSec = Number(request.endSec);
    const limitSec = maxEndSec(video);

    if (!Number.isInteger(startSec) || !Number.isInteger(endSec)) throw invalid("not_whole_seconds");
    if (startSec < 0) throw invalid("start_negative");
    if (endSec > limitSec) throw invalid("end_after_duration", { limitSec }); // REQ-039
    if (startSec >= endSec) throw invalid("start_not_before_end"); // REQ-038
    if (endSec - startSec < 1) throw invalid("too_short", { minSec: 1 }); // REQ-037

    // FA1 / REQ-VID-TRIM-026: the whole video would be a copy of the original
    if (startSec === 0 && endSec === limitSec && request.confirmFullCopy !== true) {
      throw new AppError(409, "full_copy_confirmation_required", "The interval covers the whole video.");
    }

    // REQ-VID-TRIM-007/008: MP4 or MOV, the original format by default
    const outputFormat = request.outputFormat ? String(request.outputFormat).toLowerCase() : video.format;
    if (!OUTPUT_FORMATS.includes(outputFormat)) {
      throw new AppError(400, "invalid_output_format", "The output format must be MP4 or MOV.", { accepted: ["MP4", "MOV"] });
    }

    // REQ-VID-TRIM-009/010: custom name or {original}_recorte_{start}-{end}
    const custom = typeof request.name === "string" ? request.name.trim() : "";
    if (custom.length > MAX_NAME_LENGTH) throw new AppError(400, "invalid_name", "The name is too long.");
    const name = custom || `${baseName(video.name)}_recorte_${startSec}-${endSec}`;

    return { startSec, endSec, outputFormat, name };
  },

  /** E7: expected size of the result, proportional to the interval. */
  estimateBytes(video, params) {
    const duration = Number(video.durationSec) || 1;
    return Math.ceil(video.sizeBytes * Math.min(1, (params.endSec - params.startSec) / duration));
  },

  expectedDurationSec(params) {
    return params.endSec - params.startSec;
  },

  /**
   * Re-encodes the interval with H.264 (decision of the team): exact cut at
   * the requested second (REQ-VID-TRIM-052, ±1 s), same resolution and frame
   * rate as the original (REQ-VID-TRIM-051: no scaling, no fps change), audio
   * kept as AAC when present (RN1). The original is only read (REQ-VID-TRIM-054).
   */
  buildArgs({ input, output, params }) {
    return [
      "-v", "error",
      "-y",
      "-ss", String(params.startSec),
      "-i", input,
      "-t", String(params.endSec - params.startSec),
      "-map", "0:v:0",
      "-map", "0:a:0?",
      "-c:v", "libx264",
      "-preset", process.env.TRIM_X264_PRESET || "veryfast",
      "-crf", "20",
      "-c:a", "aac",
      "-b:a", "160k",
      "-movflags", "+faststart",
      "-f", params.outputFormat,
      output,
    ];
  },
};

module.exports = { trimTool, maxEndSec };
