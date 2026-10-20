// Application error carrying an HTTP status and a stable machine-readable
// code. The frontend maps each code to a user message (see
// frontend/lib/videos.ts -> describeVideoError).
class AppError extends Error {
  constructor(status, code, message, details) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

module.exports = { AppError };
