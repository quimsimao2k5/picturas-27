// Video life cycle - UC-VID-002 RN7.
// Code values are in English; the specification (pt-PT) names are kept in the
// comments so the mapping to the requirements stays explicit.
const VIDEO_STATUS = Object.freeze({
  UPLOADING: "uploading", // "A carregar"  - step 5, the only cancellable state
  VALIDATING: "validating", // "A validar" - steps 6-7, not cancellable
  AVAILABLE: "available", // "Disponível" - step 8
  REJECTED: "rejected", // "Rejeitado"  - a validation in steps 6-7 failed
});

// Processing requests (e.g. UC-VID-001 trim) - managed by this same service
// (UC-VID-002 A8 / UC-VID-001 A9).
const JOB_STATUS = Object.freeze({
  QUEUED: "queued", // "Em fila"
  PROCESSING: "processing", // "A processar"
  COMPLETED: "completed", // "Concluído"
  FAILED: "failed", // "Falhou"
  CANCELLED: "cancelled", // "Cancelado"
});

const ACTIVE_JOB_STATUSES = [JOB_STATUS.QUEUED, JOB_STATUS.PROCESSING];

// Rejection reasons (exceptions E2 and E5-E9 of UC-VID-002).
const REJECTION = Object.freeze({
  UNSUPPORTED_FORMAT: "unsupported_format", // E2 (container detected after upload)
  UNSUPPORTED_VIDEO_CODEC: "unsupported_video_codec", // E5
  UNSUPPORTED_AUDIO_CODEC: "unsupported_audio_codec", // E6
  CORRUPTED: "corrupted", // E7
  DURATION_EXCEEDED: "duration_exceeded", // E8
  RESOLUTION_EXCEEDED: "resolution_exceeded", // E9
});

module.exports = { VIDEO_STATUS, JOB_STATUS, ACTIVE_JOB_STATUSES, REJECTION };
