// Unit tests - UC-VID-002 step 4 pre-checks (E2, E3, E4).
const test = require("node:test");
const assert = require("node:assert/strict");
const { checkUploadRequest, detectFormat } = require("../services/uploadRules");
const { LIMITS, MiB, GiB } = require("../config/limits");

const free = LIMITS.free;
const premium = LIMITS.premium;

function codeOf(fn) {
  try {
    fn();
  } catch (err) {
    return err.code;
  }
  return null;
}

test("REQ-VID-LIB-041: identifies MP4 and MOV from the selected file", () => {
  assert.equal(detectFormat("clip.mp4"), "mp4");
  assert.equal(detectFormat("Clip.MOV"), "mov");
  assert.equal(detectFormat("clip.avi"), null);
});

test("REQ-VID-LIB-050 / 035 (E2): rejects .avi and .mkv before creating a record", () => {
  for (const fileName of ["film.avi", "film.mkv", "film"]) {
    assert.equal(
      codeOf(() => checkUploadRequest({ fileName, sizeBytes: 10 }, free, 0)),
      "unsupported_format",
    );
  }
});

test("REQ-VID-LIB-018: accepts .mp4 (video/mp4) and .mov (video/quicktime)", () => {
  assert.equal(checkUploadRequest({ fileName: "a.mp4", sizeBytes: 10, mimeType: "video/mp4" }, free, 0).format, "mp4");
  assert.equal(checkUploadRequest({ fileName: "a.mov", sizeBytes: 10, mimeType: "video/quicktime" }, free, 0).format, "mov");
});

test("E2: rejects a .mp4 name with a non-video MIME type", () => {
  assert.equal(
    codeOf(() => checkUploadRequest({ fileName: "a.mp4", sizeBytes: 10, mimeType: "image/png" }, free, 0)),
    "unsupported_format",
  );
});

test("REQ-VID-LIB-015 / 037 (E3): 120 MB rejected for Registered, accepted for Premium", () => {
  const request = { fileName: "big.mp4", sizeBytes: 120 * MiB };
  assert.equal(codeOf(() => checkUploadRequest(request, free, 0)), "file_too_large");
  assert.equal(checkUploadRequest(request, premium, 0).sizeBytes, 120 * MiB);
});

test("REQ-VID-LIB-015 (E3): 1.2 GB rejected for Premium", () => {
  assert.equal(
    codeOf(() => checkUploadRequest({ fileName: "huge.mov", sizeBytes: Math.round(1.2 * GiB) }, premium, 0)),
    "file_too_large",
  );
});

test("REQ-VID-LIB-017 / 038 (E4): 450 MB used + 60 MB rejected for Registered", () => {
  assert.equal(
    codeOf(() => checkUploadRequest({ fileName: "a.mp4", sizeBytes: 60 * MiB }, free, 450 * MiB)),
    "insufficient_storage",
  );
  // exactly filling the library is allowed
  assert.ok(checkUploadRequest({ fileName: "a.mp4", sizeBytes: 50 * MiB }, free, 450 * MiB));
});

test("rejects invalid sizes and empty names", () => {
  assert.equal(codeOf(() => checkUploadRequest({ fileName: "a.mp4", sizeBytes: 0 }, free, 0)), "invalid_size");
  assert.equal(codeOf(() => checkUploadRequest({ fileName: "a.mp4", sizeBytes: "x" }, free, 0)), "invalid_size");
  assert.equal(codeOf(() => checkUploadRequest({ fileName: "  ", sizeBytes: 1 }, free, 0)), "invalid_file_name");
});
