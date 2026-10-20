// Adapter around the external media engine (FFmpeg / ffprobe).
// Isolating the binary here keeps the business rules (videoValidator.js)
// independent of the tool, in line with the portability decision taken for
// the video features (cf. REQ-VID-TRIM-061). The binary path is configurable.

const { execFile } = require("child_process");

const FFPROBE_BIN = process.env.FFPROBE_PATH || "ffprobe";
const PROBE_TIMEOUT_MS = Number(process.env.FFPROBE_TIMEOUT_MS) || 120000;

/**
 * Probes a local media file.
 * `-count_packets` makes ffprobe demux the whole file, which exposes
 * truncated / damaged files (UC-VID-002 E7) without decoding every frame.
 *
 * @param {string} filePath
 * @returns {Promise<{ok: boolean, data: object|null, errors: string}>}
 *   ok=false when ffprobe could not read the file at all.
 */
function probe(filePath) {
  const args = [
    "-v", "error",
    "-count_packets",
    "-show_format",
    "-show_streams",
    "-of", "json",
    filePath,
  ];

  return new Promise((resolve) => {
    execFile(
      FFPROBE_BIN,
      args,
      { maxBuffer: 16 * 1024 * 1024, timeout: PROBE_TIMEOUT_MS },
      (error, stdout, stderr) => {
        let data = null;
        try {
          data = stdout ? JSON.parse(stdout) : null;
        } catch (_) {
          data = null;
        }
        resolve({
          ok: !error && !!data,
          data,
          errors: String(stderr || "").trim(),
        });
      },
    );
  });
}

module.exports = { probe };
