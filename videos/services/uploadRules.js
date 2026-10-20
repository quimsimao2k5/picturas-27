// Preliminary checks of UC-VID-002 step 4, executed BEFORE the video record is
// created and before any byte is transferred (exceptions E2, E3 and E4).
// Pure functions: no I/O, so they are unit-tested directly.

const path = require("path");
const { AppError } = require("../utils/errors");

// RN4 - containers supported in the MVP.
const ALLOWED_EXTENSIONS = { ".mp4": "mp4", ".mov": "mov" };
// MIME types reported by browsers for MP4/MOV. An empty type or a generic
// octet-stream is tolerated: the real container is verified by ffprobe in
// step 6 (UC-VID-002 A5).
const ALLOWED_MIME_TYPES = [
  "",
  "video/mp4",
  "video/quicktime",
  "application/octet-stream",
];

const MAX_NAME_LENGTH = 255;

/**
 * Identifies the format of a file from its name (REQ-VID-LIB-041).
 * @returns "mp4" | "mov" | null
 */
function detectFormat(fileName) {
  const ext = path.extname(String(fileName || "")).toLowerCase();
  return ALLOWED_EXTENSIONS[ext] ?? null;
}

/**
 * Validates an upload request (step 4).
 * @param {{fileName: string, sizeBytes: number, mimeType?: string}} request
 * @param {object} limits    limits of the user's profile (config/limits.js)
 * @param {number} occupiedBytes  bytes already used + reserved by uploads in progress
 * @returns {{name: string, format: string, sizeBytes: number, mimeType: string}}
 * @throws AppError
 */
function checkUploadRequest(request, limits, occupiedBytes) {
  const fileName = typeof request?.fileName === "string" ? request.fileName.trim() : "";
  if (!fileName || fileName.length > MAX_NAME_LENGTH) {
    throw new AppError(400, "invalid_file_name", "A file name is required.");
  }

  const sizeBytes = Number(request?.sizeBytes);
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
    throw new AppError(400, "invalid_size", "The file size is invalid.");
  }

  // E2 / REQ-VID-LIB-050, REQ-VID-LIB-035
  const format = detectFormat(fileName);
  const mimeType = typeof request?.mimeType === "string" ? request.mimeType.toLowerCase() : "";
  if (!format || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    throw new AppError(415, "unsupported_format", "Only MP4 and MOV videos are supported.", {
      accepted: ["MP4", "MOV"],
    });
  }

  // E3 / REQ-VID-LIB-015, REQ-VID-LIB-037
  if (sizeBytes > limits.maxFileBytes) {
    throw new AppError(413, "file_too_large", "The video exceeds the maximum size of your plan.", {
      limitBytes: limits.maxFileBytes,
      sizeBytes,
    });
  }

  // E4 / REQ-VID-LIB-017, REQ-VID-LIB-038
  const freeBytes = Math.max(0, limits.storageBytes - occupiedBytes);
  if (sizeBytes > freeBytes) {
    throw new AppError(507, "insufficient_storage", "There is not enough space in your video library.", {
      limitBytes: limits.storageBytes,
      freeBytes,
      sizeBytes,
    });
  }

  return { name: fileName, format, sizeBytes, mimeType: mimeType || defaultMime(format) };
}

function defaultMime(format) {
  return format === "mov" ? "video/quicktime" : "video/mp4";
}

module.exports = { checkUploadRequest, detectFormat, ALLOWED_MIME_TYPES };
