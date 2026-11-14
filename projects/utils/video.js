// Video support in the projects orchestrator.
// Media type detection, reading the characteristics with ffprobe and
// validation against the profile limits.
const { execFile } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

// Accepted input containers and codecs
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];
const VIDEO_MIMES = ["video/mp4", "video/quicktime", "video/webm"];
const ALLOWED_VIDEO_CODECS = ["h264", "hevc", "vp8", "vp9", "av1", "mpeg4"];

// Effects the video worker can apply
const VIDEO_TOOLS = [
  "brightness", "contrast", "saturation", "rotate", "resize",
  "binarization", "cut", "border", "trim", "speed", "subtitles", "extract_frames",
];
// Effects that only exist for video (images ignore them)
const VIDEO_ONLY_TOOLS = ["trim", "speed", "subtitles", "extract_frames"];

// Effects that belong to the video they were defined on (params.imgId),
// because their values only make sense for that video
const PER_VIDEO_TOOLS = ["trim", "speed"];

const num = (name, def) => {
  const v = parseFloat(process.env[name]);
  return Number.isFinite(v) ? v : def;
};

// Per-profile limits, configurable through environment variables.
// Anonymous users cannot edit video.
const VIDEO_LIMITS = {
  anonymous: null,
  free: {
    maxDurationS: num("VIDEO_FREE_MAX_DURATION_S", 60),
    maxSizeMB: num("VIDEO_FREE_MAX_SIZE_MB", 100),
    maxWidth: 1920,
    maxHeight: 1080,
  },
  premium: {
    maxDurationS: num("VIDEO_PREMIUM_MAX_DURATION_S", 600),
    maxSizeMB: num("VIDEO_PREMIUM_MAX_SIZE_MB", 1024),
    maxWidth: 3840,
    maxHeight: 2160,
  },
};

function isVideoFile(originalname, mimetype) {
  const ext = path.extname(originalname || "").toLowerCase();
  return VIDEO_EXTENSIONS.includes(ext) || (mimetype || "").startsWith("video/");
}

function isVideoMedia(img) {
  return img && img.media_type === "video";
}

// Result name: edited video is always MP4
function videoOutputName(originalname) {
  const base = path.basename(originalname, path.extname(originalname));
  return `${base}.mp4`;
}

function ffprobe(filePath) {
  return new Promise((resolve, reject) => {
    execFile(
      "ffprobe",
      ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", filePath],
      { maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return reject(new Error("Unreadable or corrupted video file"));
        try {
          resolve(JSON.parse(stdout));
        } catch (e) {
          reject(new Error("Unreadable or corrupted video file"));
        }
      }
    );
  });
}

// Reads the characteristics of an in-memory video
async function probeVideoBuffer(buffer, originalname) {
  const tmp = path.join(os.tmpdir(), `${uuidv4()}${path.extname(originalname || ".mp4")}`);
  fs.writeFileSync(tmp, buffer);
  try {
    const data = await ffprobe(tmp);
    const streams = data.streams || [];
    const video = streams.find((s) => s.codec_type === "video");
    const audio = streams.find((s) => s.codec_type === "audio");
    if (!video) throw new Error("The file has no video stream");

    const duration = parseFloat((data.format || {}).duration || video.duration || "0");
    const [n, d] = String(video.avg_frame_rate || video.r_frame_rate || "0/1").split("/");
    const fps = parseFloat(d) ? parseFloat(n) / parseFloat(d) : 0;

    return {
      duration,
      width: video.width,
      height: video.height,
      fps: Math.round(fps * 100) / 100,
      video_codec: video.codec_name,
      audio_codec: audio ? audio.codec_name : null,
      format_name: (data.format || {}).format_name,
      size_bytes: buffer.length,
    };
  } finally {
    fs.rmSync(tmp, { force: true });
  }
}

// Validates a video against the accepted formats and the profile limits.
// Returns null if accepted, or a message with the rejection reason.
function validateVideo(meta, originalname, mimetype, userType) {
  const ext = path.extname(originalname || "").toLowerCase();
  if (!VIDEO_EXTENSIONS.includes(ext) && !VIDEO_MIMES.includes(mimetype)) {
    return `Unsupported video format. Accepted formats: ${VIDEO_EXTENSIONS.join(", ")}`;
  }
  if (!ALLOWED_VIDEO_CODECS.includes(meta.video_codec)) {
    return `Unsupported video codec '${meta.video_codec}'. Accepted codecs: ${ALLOWED_VIDEO_CODECS.join(", ")}`;
  }
  if (!(meta.duration > 0)) {
    return "Could not determine the video duration";
  }

  const limits = VIDEO_LIMITS[userType];
  if (!limits) {
    return "Anonymous users cannot upload videos. Create an account to edit video.";
  }
  if (meta.duration > limits.maxDurationS) {
    return `The video is ${meta.duration.toFixed(1)} s long and your profile limit is ${limits.maxDurationS} s`;
  }
  if (meta.size_bytes > limits.maxSizeMB * 1024 * 1024) {
    return `The video is ${(meta.size_bytes / 1048576).toFixed(1)} MB and your profile limit is ${limits.maxSizeMB} MB`;
  }
  const longSide = Math.max(meta.width, meta.height);
  const shortSide = Math.min(meta.width, meta.height);
  if (longSide > limits.maxWidth || shortSide > limits.maxHeight) {
    return `Resolution ${meta.width}x${meta.height} exceeds your profile limit (${limits.maxWidth}x${limits.maxHeight})`;
  }
  return null;
}

// Pipeline tools that apply to images (video-only tools are skipped)
function imageTools(project) {
  return [...(project.tools || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .filter((t) => !VIDEO_ONLY_TOOLS.includes(t.procedure));
}

// Trim and speed belong to the video they were defined on.
// Every other effect applies to all media of the project.
function appliesToVideo(tool, imgId) {
  if (!PER_VIDEO_TOOLS.includes(tool.procedure)) return true;
  const target = tool.params && tool.params.imgId;
  return !target || String(target) === String(imgId);
}

// The ordered pipeline of one video, sent to the video worker in a single message
function videoPipeline(project, imgId) {
  return [...(project.tools || [])]
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
    .filter((t) => appliesToVideo(t, imgId))
    .map((t) => ({ procedure: t.procedure, params: t.params }));
}

// Pipeline effects that make no sense for video
function unsupportedVideoTools(project) {
  return (project.tools || [])
    .map((t) => t.procedure)
    .filter((p) => !VIDEO_TOOLS.includes(p));
}

// Extraction changes the output from video to images, so it must be terminal.
function validateFrameExtraction(tools) {
  const ordered = [...(tools || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const extractors = ordered.filter((tool) => tool.procedure === "extract_frames");
  if (extractors.length === 0) return null;
  if (extractors.length !== 1) return "Only one frame extraction tool is allowed";
  const tool = extractors[0];
  if (ordered[ordered.length - 1] !== tool) return "Frame extraction must be the last tool in the pipeline";
  const params = tool.params;
  if (!params || typeof params !== "object" || Array.isArray(params)) return "Frame extraction parameters are required";
  if (params.imgId !== undefined) return "Frame extraction applies to all videos, not a single video";
  if (!["count", "interval"].includes(params.mode)) return "Frame extraction mode must be count or interval";
  if (!["png", "jpeg"].includes(params.format)) return "Frame extraction format must be png or jpeg";
  if (params.mode === "count" && (!Number.isInteger(params.count) || params.count < 1 || params.count > 100)) {
    return "Frame count must be an integer between 1 and 100";
  }
  if (params.mode === "interval" && (typeof params.interval !== "number" || !Number.isFinite(params.interval) || params.interval <= 0)) {
    return "Frame interval must be a positive number of seconds";
  }
  return null;
}

// Newly added effects run before the terminal extractor, regardless of client position.
function insertPipelineTool(tools, tool) {
  const ordered = [...(tools || [])].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const terminal = ordered.findIndex((item) => item.procedure === "extract_frames");
  ordered.splice(terminal < 0 || tool.procedure === "extract_frames" ? ordered.length : terminal, 0, tool);
  return ordered.map((item, position) => ({ ...(item.toObject ? item.toObject() : item), position }));
}

// ---- Video stages ---------------------------------------------------------
// A video pipeline runs as a chain of stages, one message each, sent to the
// service that owns the stage (as the image tools are chained one by one):
//   video_effects   - consecutive frame/time effects, one decode and one encode
//   video_subtitles - one subtitles tool (speech recognition + captions)
//   video_frames    - extract_frames, always the last stage
// The rules are the ones the single video worker used internally.
const VIDEO_STAGE_SERVICES = ["video_effects", "video_subtitles", "video_frames"];
const TEMPORAL_TOOLS = ["trim", "speed"];

function editStages(tools, preview) {
  if (!tools.some((t) => t.procedure === "subtitles")) {
    return [{ service: "video_effects", tools: [...tools], previewCut: !!preview }];
  }
  const stages = [];
  let pending = [];
  for (const tool of tools) {
    if (tool.procedure === "subtitles") {
      // An effects stage first normalizes the input to MP4/H.264, even if empty
      if (pending.length || !stages.length) {
        stages.push({ service: "video_effects", tools: pending });
        pending = [];
      }
      stages.push({ service: "video_subtitles", tools: [tool] });
    } else {
      pending.push(tool);
    }
  }
  if (pending.length) stages.push({ service: "video_effects", tools: pending });
  // A preview is the first seconds of the final timeline: cut it in the last
  // effects stage with trim/speed (or the first one), keeping earlier stages whole.
  let cut = 0;
  stages.forEach((stage, i) => {
    if (stage.service === "video_effects" && stage.tools.some((t) => TEMPORAL_TOOLS.includes(t.procedure))) cut = i;
  });
  stages.forEach((stage, i) => {
    if (stage.service === "video_effects") stage.previewCut = !!preview && i === cut;
  });
  return stages;
}

// Splits the ordered pipeline of one video (videoPipeline) into stages
function videoStages(tools, preview = false) {
  const list = tools || [];
  const last = list[list.length - 1];
  if (!last || last.procedure !== "extract_frames") return editStages(list, preview);
  // Sampling spans the complete edited timeline, including in preview;
  // extraction alone reads the original without transcoding.
  const before = list.slice(0, -1);
  return [...(before.length ? editStages(before, false) : []), { service: "video_frames", tools: [last] }];
}

// Parameters of the message for stage `index` of a video job
function videoStageParams(job, index) {
  const stage = job.stages[index];
  return {
    tools: stage.tools,
    preview: !!job.preview,
    previewCut: !!stage.previewCut,
    stage: index,
    stages: job.stages.length,
    progress: job.progress,
  };
}

// The last stage writes the final output; the others write into the job's
// work directory on the shared volume, removed when the job ends.
function videoStageOutput(job, index) {
  return index === job.stages.length - 1 ? job.final_uri : `${job.work_dir}/stage-${index}.mp4`;
}

// Everything the orchestrator needs to chain the stages of one video
function newVideoJob(tools, { preview, progress, finalUri }) {
  return {
    stages: videoStages(tools, preview),
    preview: !!preview,
    progress,
    final_uri: finalUri,
    work_dir: `${path.posix.dirname(finalUri)}/video-stages-${uuidv4()}`,
    started_at: new Date(),
  };
}

function removeVideoWorkDir(job, baseDir) {
  if (!job || !job.work_dir) return;
  try {
    fs.rmSync(path.resolve(baseDir, job.work_dir), { recursive: true, force: true });
  } catch (err) {
    console.error(`[video] could not remove ${job.work_dir}: ${err.message}`);
  }
}

// One operation per applied effect, per video, regardless of duration
function videoOps(project) {
  return (project.imgs || [])
    .filter(isVideoMedia)
    .reduce((acc, img) => acc + videoPipeline(project, img._id).length, 0);
}

module.exports = {
  VIDEO_LIMITS,
  VIDEO_TOOLS,
  VIDEO_ONLY_TOOLS,
  isVideoFile,
  isVideoMedia,
  videoOutputName,
  probeVideoBuffer,
  validateVideo,
  imageTools,
  videoPipeline,
  unsupportedVideoTools,
  videoOps,
  validateFrameExtraction,
  insertPipelineTool,
  VIDEO_STAGE_SERVICES,
  videoStages,
  videoStageParams,
  videoStageOutput,
  newVideoJob,
  removeVideoWorkDir,
};
