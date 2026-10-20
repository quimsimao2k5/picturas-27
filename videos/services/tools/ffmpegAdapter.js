// Adapter around the FFmpeg binary - REQ-VID-TRIM-061 / DQ-005.
// The business logic never spawns commands directly: it builds an argument
// list (tools/*.js) and hands it to this adapter, which reports progress and
// can be cancelled. The binary path is configurable (FFMPEG_PATH).

const { spawn } = require("child_process");

const FFMPEG_BIN = process.env.FFMPEG_PATH || "ffmpeg";

class CancelledError extends Error {
  constructor() {
    super("cancelled");
    this.cancelled = true;
  }
}

/**
 * Runs FFmpeg.
 * @param {string[]} args             arguments (input/output included)
 * @param {object}   opts
 * @param {number}   opts.durationSec expected output duration, for the %
 * @param {(percent:number)=>void} [opts.onProgress]
 * @returns {{ promise: Promise<void>, cancel: () => void }}
 */
function run(args, { durationSec, onProgress } = {}) {
  let cancelled = false;
  const child = spawn(FFMPEG_BIN, ["-nostdin", "-progress", "pipe:1", "-nostats", ...args], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let stderr = "";
  child.stderr.on("data", (d) => {
    stderr = (stderr + d.toString()).slice(-4000);
  });

  let buffer = "";
  child.stdout.on("data", (d) => {
    buffer += d.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop();
    for (const line of lines) {
      // out_time_us (and the historically misnamed out_time_ms) are microseconds
      const m = line.match(/^out_time_(?:us|ms)=(\d+)/);
      if (m && onProgress && durationSec > 0) {
        const percent = Math.min(99, Math.floor((Number(m[1]) / 1e6 / durationSec) * 100));
        onProgress(Math.max(0, percent));
      }
    }
  });

  const promise = new Promise((resolve, reject) => {
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (cancelled) return reject(new CancelledError());
      if (code === 0) return resolve();
      const err = new Error(`ffmpeg exited with code ${code}: ${stderr.trim().split("\n").pop() || ""}`);
      err.stderr = stderr;
      reject(err);
    });
  });

  return {
    promise,
    cancel() {
      cancelled = true;
      child.kill("SIGKILL");
    },
  };
}

module.exports = { run, CancelledError };
