// Generates real media files with FFmpeg for the validation tests.
// Files are cached in the OS temp directory; tests are skipped when FFmpeg is
// not installed (it is installed in the service Docker image).
const { execFileSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const DIR = path.join(os.tmpdir(), "picturas-video-fixtures");

function hasFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    execFileSync("ffprobe", ["-version"], { stdio: "ignore" });
    return true;
  } catch (_) {
    return false;
  }
}

// Test files run in parallel processes: write to a private temporary name and
// rename atomically, so a process never reads a half-written fixture.
function tmpNameFor(target) {
  const ext = path.extname(target);
  return `${target.slice(0, -ext.length)}.${process.pid}.tmp${ext}`;
}

function ffmpeg(args, out) {
  const target = path.join(DIR, out);
  if (!fs.existsSync(target)) {
    fs.mkdirSync(DIR, { recursive: true });
    const tmp = tmpNameFor(target);
    execFileSync("ffmpeg", ["-v", "error", "-y", ...args, tmp], { stdio: "inherit" });
    fs.renameSync(tmp, target);
  }
  return target;
}

function writeAtomic(target, data) {
  fs.mkdirSync(DIR, { recursive: true });
  const tmp = tmpNameFor(target);
  fs.writeFileSync(tmp, data);
  fs.renameSync(tmp, target);
}

const video = (size, seconds = 1) => [
  "-f", "lavfi", "-i", `testsrc=size=${size}:rate=25`, "-t", String(seconds),
];
const audio = (seconds = 1) => ["-f", "lavfi", "-i", "sine=frequency=440", "-t", String(seconds)];
const h264 = ["-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p"];

const fixtures = {
  h264AacMp4: () => ffmpeg([...video("320x240", 2), ...audio(2), ...h264, "-c:a", "aac"], "h264_aac.mp4"),
  h264NoAudioMov: () => ffmpeg([...video("320x240", 1), ...h264], "h264_noaudio.mov"),
  mpeg4Mp4: () => ffmpeg([...video("320x240", 1), "-c:v", "mpeg4"], "mpeg4.mp4"),
  h264Mp3Mp4: () => ffmpeg([...video("320x240", 1), ...audio(1), ...h264, "-c:a", "libmp3lame"], "h264_mp3.mp4"),
  h264Mkv: () => ffmpeg([...video("320x240", 1), ...h264, "-f", "matroska"], "h264_mkv_named.mp4"),
  vertical1080: () => ffmpeg([...video("1080x1920", 0.2), ...h264], "vertical_1080x1920.mp4"),
  uhd4k: () => ffmpeg([...video("3840x2160", 0.2), ...h264], "uhd_3840x2160.mp4"),
  truncated() {
    const target = path.join(DIR, "truncated.mp4");
    if (!fs.existsSync(target)) {
      const src = fs.readFileSync(this.h264AacMp4());
      writeAtomic(target, src.subarray(0, Math.floor(src.length * 0.6)));
    }
    return target;
  },
  truncatedFaststart() {
    const full = ffmpeg([...video("320x240", 2), ...h264, "-movflags", "+faststart"], "faststart.mp4");
    const target = path.join(DIR, "truncated_faststart.mp4");
    if (!fs.existsSync(target)) {
      const src = fs.readFileSync(full);
      writeAtomic(target, src.subarray(0, Math.floor(src.length * 0.6)));
    }
    return target;
  },
  garbage() {
    const target = path.join(DIR, "garbage.mp4");
    if (!fs.existsSync(target)) {
      writeAtomic(target, Buffer.from("this is not a video ".repeat(500)));
    }
    return target;
  },
};

module.exports = { fixtures, hasFfmpeg };
