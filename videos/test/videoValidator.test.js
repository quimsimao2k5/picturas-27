// Unit + integration tests - UC-VID-002 steps 6-7 (E2 after upload, E5-E9).
// Integration cases run the real ffprobe on files generated with FFmpeg.
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateProbe } = require("../services/videoValidator");
const { probe } = require("../services/mediaProbe");
const { LIMITS } = require("../config/limits");
const { fixtures, hasFfmpeg } = require("./helpers/fixtures");

const free = LIMITS.free;
const premium = LIMITS.premium;
const ffmpegMissing = !hasFfmpeg() && "FFmpeg not installed";

const check = async (file, limits = free) => validateProbe(await probe(file), limits);

// ---------------------------------------------------------------- real files

test("REQ-VID-LIB-019 / 046 / 022 / 023: MP4 H.264+AAC accepted with metadata", { skip: ffmpegMissing }, async () => {
  const result = await check(fixtures.h264AacMp4());
  assert.equal(result.ok, true);
  assert.equal(result.metadata.videoCodec, "h264");
  assert.equal(result.metadata.audioCodec, "aac");
  assert.equal(result.metadata.width, 320);
  assert.equal(result.metadata.height, 240);
  assert.ok(Math.abs(result.metadata.durationSec - 2) < 0.2);
});

test("REQ-VID-LIB-046: MOV H.264 without audio accepted", { skip: ffmpegMissing }, async () => {
  const result = await check(fixtures.h264NoAudioMov());
  assert.equal(result.ok, true);
  assert.equal(result.metadata.audioCodec, null);
});

test("REQ-VID-LIB-051 / 036 (E5): MPEG-4 Part 2 video rejected", { skip: ffmpegMissing }, async () => {
  const result = await check(fixtures.mpeg4Mp4());
  assert.equal(result.ok, false);
  assert.equal(result.rejection.code, "unsupported_video_codec");
  assert.equal(result.rejection.details.found, "mpeg4");
});

test("REQ-VID-LIB-052 / 053 (E6): MP3 audio rejected", { skip: ffmpegMissing }, async () => {
  const result = await check(fixtures.h264Mp3Mp4());
  assert.equal(result.rejection.code, "unsupported_audio_codec");
  assert.equal(result.rejection.details.found, "mp3");
});

test("REQ-VID-LIB-020 / 054 (E7): truncated file (moov at the end) rejected", { skip: ffmpegMissing }, async () => {
  assert.equal((await check(fixtures.truncated())).rejection.code, "corrupted");
});

test("REQ-VID-LIB-020 / 054 (E7): truncated file (moov at the start) rejected", { skip: ffmpegMissing }, async () => {
  assert.equal((await check(fixtures.truncatedFaststart())).rejection.code, "corrupted");
});

test("REQ-VID-LIB-020 (E7): non-video bytes with .mp4 name rejected", { skip: ffmpegMissing }, async () => {
  assert.equal((await check(fixtures.garbage())).rejection.code, "corrupted");
});

test("REQ-VID-LIB-018 (E2 after upload): Matroska content named .mp4 rejected", { skip: ffmpegMissing }, async () => {
  assert.equal((await check(fixtures.h264Mkv())).rejection.code, "unsupported_format");
});

test("REQ-VID-LIB-055 (E9): 3840x2160 rejected for Registered, accepted for Premium", { skip: ffmpegMissing }, async () => {
  const file = fixtures.uhd4k();
  const asFree = await check(file, free);
  assert.equal(asFree.rejection.code, "resolution_exceeded");
  assert.equal(asFree.rejection.details.limitLabel, "1080p");
  assert.equal((await check(file, premium)).ok, true);
});

test("REQ-VID-LIB-055 / RN10: vertical 1080x1920 accepted for Registered", { skip: ffmpegMissing }, async () => {
  const result = await check(fixtures.vertical1080(), free);
  assert.equal(result.ok, true);
  assert.equal(result.metadata.width, 1080);
  assert.equal(result.metadata.height, 1920);
});

test("REQ-VID-LIB-016 / 047 (E8): duration above the profile limit rejected", { skip: ffmpegMissing }, async () => {
  const result = await check(fixtures.h264AacMp4(), { ...free, maxDurationSec: 1 });
  assert.equal(result.rejection.code, "duration_exceeded");
  assert.equal(result.rejection.details.limitSec, 1);
});

// -------------------------------------------------------- synthetic probes

const synthetic = (streams, format = {}) => ({
  ok: true,
  errors: "",
  data: {
    format: { format_name: "mov,mp4,m4a,3gp,3g2,mj2", duration: "10.0", ...format },
    streams,
  },
});
const h264Stream = (extra = {}) => ({
  codec_type: "video",
  codec_name: "h264",
  width: 1920,
  height: 1080,
  nb_read_packets: "250",
  ...extra,
});

test("E8: 200 s rejected for Registered (limit 180 s), accepted for Premium", () => {
  const p = synthetic([h264Stream()], { duration: "200" });
  assert.equal(validateProbe(p, free).rejection.code, "duration_exceeded");
  assert.equal(validateProbe(p, premium).ok, true);
});

test("rotation metadata: 1920x1080 stream rotated 90 degrees is reported as 1080x1920", () => {
  const p = synthetic([h264Stream({ side_data_list: [{ rotation: -90 }] })]);
  const r = validateProbe(p, free);
  assert.equal(r.ok, true);
  assert.deepEqual([r.metadata.width, r.metadata.height], [1080, 1920]);
});

test("cover art (attached picture) is not treated as the video stream", () => {
  const cover = { codec_type: "video", codec_name: "mjpeg", disposition: { attached_pic: 1 } };
  assert.equal(validateProbe(synthetic([h264Stream(), cover]), free).ok, true);
});

test("E7: no readable video stream is treated as corrupted", () => {
  const audioOnly = { codec_type: "audio", codec_name: "aac" };
  assert.equal(validateProbe(synthetic([audioOnly]), free).rejection.code, "corrupted");
  assert.equal(validateProbe(synthetic([h264Stream({ nb_read_packets: "0" })]), free).rejection.code, "corrupted");
});
