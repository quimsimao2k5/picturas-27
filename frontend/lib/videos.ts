// Video Library API client (UC-VID-002).
import axios, { AxiosProgressEvent } from "axios";
import { api } from "./axios";

export type VideoStatus = "uploading" | "validating" | "available" | "rejected";

export interface VideoRejection {
  code: string;
  details?: Record<string, unknown>;
}

export interface Video {
  _id: string;
  name: string;
  format: "mp4" | "mov";
  sizeBytes: number;
  status: VideoStatus;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  videoCodec: string | null;
  audioCodec: string | null;
  rejection: VideoRejection | null;
  createdAt: string | null;
  availableAt: string | null;
}

export interface VideoLimits {
  maxFileBytes: number;
  maxDurationSec: number;
  maxLongSide: number;
  maxShortSide: number;
  storageBytes: number;
  resolutionLabel: string;
}

export interface VideoLibrary {
  profile: "free" | "premium";
  limits: VideoLimits;
  storage: { usedBytes: number; reservedBytes: number; limitBytes: number };
  videos: Video[];
  recent: Video[];
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// ------------------------------------------------------------------ requests

/** Step 1: library, storage and recent uploads panel. */
export const fetchVideoLibrary = async (uid: string, token: string) => {
  const response = await api.get<VideoLibrary>(`/videos/${uid}`, {
    headers: auth(token),
  });
  return response.data;
};

/** FA4: metadata of a single video. */
export const fetchVideo = async (uid: string, token: string, videoId: string) => {
  const response = await api.get<Video>(`/videos/${uid}/${videoId}`, {
    headers: auth(token),
  });
  return response.data;
};

/** Step 4: preliminary checks + create the upload record. */
export const createVideoUpload = async ({
  uid,
  token,
  file,
}: {
  uid: string;
  token: string;
  file: File;
}) => {
  const response = await api.post<Video>(
    `/videos/${uid}`,
    { fileName: file.name, sizeBytes: file.size, mimeType: file.type },
    { headers: auth(token) },
  );
  return response.data;
};

/**
 * Steps 5-8: sends the bytes. Resolves with the final video ("available");
 * a rejected video (HTTP 422) is returned too, so the caller can show the
 * reason. Cancellation uses the AbortSignal (FA2).
 */
export const uploadVideoContent = async ({
  uid,
  token,
  videoId,
  file,
  signal,
  onProgress,
}: {
  uid: string;
  token: string;
  videoId: string;
  file: File;
  signal: AbortSignal;
  onProgress: (percent: number) => void;
}): Promise<Video> => {
  try {
    const response = await api.put<Video>(`/videos/${uid}/${videoId}/content`, file, {
      headers: { ...auth(token), "Content-Type": "application/octet-stream" },
      signal,
      timeout: 0,
      maxBodyLength: Infinity,
      onUploadProgress: (event: AxiosProgressEvent) => {
        const total = event.total ?? file.size;
        if (total > 0) onProgress(Math.min(100, Math.round((event.loaded / total) * 100)));
      },
    });
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 422) {
      return (error.response.data as { video: Video }).video;
    }
    throw error;
  }
};

/** FA2: cancel an upload still in "uploading". */
export const cancelVideoUpload = async (uid: string, token: string, videoId: string) => {
  await api.post(`/videos/${uid}/${videoId}/cancel`, {}, { headers: auth(token) });
};

/** FA7: dismiss the notice of a rejected video. */
export const dismissVideo = async ({
  uid,
  token,
  videoId,
}: {
  uid: string;
  token: string;
  videoId: string;
}) => {
  await api.post(`/videos/${uid}/${videoId}/dismiss`, {}, { headers: auth(token) });
};

/** FA5: delete an available video. */
export const deleteVideo = async ({
  uid,
  token,
  videoId,
}: {
  uid: string;
  token: string;
  videoId: string;
}) => {
  await api.delete(`/videos/${uid}/${videoId}`, { headers: auth(token) });
};

// ------------------------------------------------------------ playback (UC-VID-003)

export interface PlaybackStart {
  sessionId: string;
  url: string; // temporary signed URL (RN2)
  expiresAt: string;
  heartbeatIntervalSec: number;
  video: Video;
}

const CLIENT_ID_KEY = "picturas-player-client-id";
let memoryClientId: string | null = null;

/**
 * Identifier of this browser (REQ-VID-PLAY-056): a new playback from the same
 * browser replaces the streams it left open (e.g. after an abrupt close).
 */
export function getPlayerClientId(): string {
  const make = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  try {
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = make();
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    memoryClientId = memoryClientId ?? make();
    return memoryClientId;
  }
}

/** Step 2: validates the request and returns a signed URL + stream session. */
export const startPlayback = async (uid: string, token: string, videoId: string) => {
  const response = await api.post<PlaybackStart>(
    `/videos/${uid}/${videoId}/playback`,
    { clientId: getPlayerClientId() },
    { headers: auth(token) },
  );
  return response.data;
};

/** RN6: the open player signals activity. */
export const playbackHeartbeat = async (uid: string, token: string, sessionId: string) => {
  await api.post(`/videos/${uid}/playback/${sessionId}/heartbeat`, {}, { headers: auth(token) });
};

/** E3a: new signed URL for the same session. */
export const renewPlayback = async (uid: string, token: string, sessionId: string) => {
  const response = await api.post<{ url: string; expiresAt: string }>(
    `/videos/${uid}/playback/${sessionId}/renew`,
    {},
    { headers: auth(token) },
  );
  return response.data;
};

/**
 * Step 5 / FA3: releases the stream. Uses fetch with keepalive so it also
 * works while the page is being closed.
 */
export const stopPlayback = (uid: string, token: string, sessionId: string) => {
  const base = String(api.defaults.baseURL ?? "/api-gateway/").replace(/\/?$/, "/");
  try {
    void fetch(`${base}videos/${uid}/playback/${sessionId}`, {
      method: "DELETE",
      keepalive: true,
      headers: auth(token),
    }).catch(() => {});
  } catch {
    // ignore - the stream is released anyway after 45 s without heartbeat
  }
};

// ------------------------------------------------------------ trim (UC-VID-001)

export type TrimStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

export interface TrimParams {
  startSec: number;
  endSec: number;
  outputFormat: "mp4" | "mov";
  name: string;
}

export interface TrimJob {
  _id: string;
  type: "trim";
  status: TrimStatus;
  progress: number;
  sourceVideoId: string;
  sourceName: string | null;
  params: TrimParams;
  attempts: number;
  error: { code: string; details?: Record<string, unknown> } | null;
  resultVideoId: string | null;
  seen: boolean;
  createdAt: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

export const TRIM_STATUS_LABEL: Record<TrimStatus, string> = {
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Step 2: E1 / E4 checks before opening the trim screen. */
export const checkTrimEligibility = async (uid: string, token: string, videoId: string) => {
  await api.get(`/videos/${uid}/${videoId}/trim-eligibility`, { headers: auth(token) });
};

/** Steps 6-8: create the request (it starts "queued"). */
export const createTrim = async ({
  uid,
  token,
  videoId,
  startSec,
  endSec,
  outputFormat,
  name,
  confirmFullCopy,
}: {
  uid: string;
  token: string;
  videoId: string;
  startSec: number;
  endSec: number;
  outputFormat: "mp4" | "mov";
  name?: string;
  confirmFullCopy?: boolean;
}) => {
  const response = await api.post<TrimJob>(
    `/videos/${uid}/${videoId}/trims`,
    { startSec, endSec, outputFormat, name: name || undefined, confirmFullCopy },
    { headers: auth(token) },
  );
  return response.data;
};

export const fetchTrims = async (uid: string, token: string) => {
  const response = await api.get<TrimJob[]>(`/videos/${uid}/trims/list`, { headers: auth(token) });
  return response.data;
};

/** FA2 */
export const cancelTrim = async ({ uid, token, jobId }: { uid: string; token: string; jobId: string }) => {
  const response = await api.post<TrimJob>(`/videos/${uid}/trims/${jobId}/cancel`, {}, { headers: auth(token) });
  return response.data;
};

/** REQ-VID-TRIM-023/035: the in-app notification was shown. */
export const markTrimSeen = async (uid: string, token: string, jobId: string) => {
  await api.post(`/videos/${uid}/trims/${jobId}/seen`, {}, { headers: auth(token) });
};

/** Step 13 / REQ-VID-TRIM-025: signed URL to download a video. */
export const fetchDownloadUrl = async (uid: string, token: string, videoId: string) => {
  const response = await api.post<{ url: string; expiresAt: string; fileName: string }>(
    `/videos/${uid}/${videoId}/download`,
    {},
    { headers: auth(token) },
  );
  return response.data;
};

/** Longest selectable end instant, 1 s precision (RN2) - same rule as the server. */
export function trimMaxEnd(video: Pick<Video, "durationSec">): number {
  return Math.max(1, Math.round(video.durationSec ?? 0));
}

/** E2 / REQ-VID-TRIM-037..041: client-side check (the server repeats it). */
export function validateTrimInterval(startSec: number, endSec: number, maxEnd: number): string | null {
  if (!Number.isInteger(startSec) || !Number.isInteger(endSec)) return "Use whole seconds for the start and end.";
  if (startSec < 0) return "The start cannot be negative.";
  if (endSec > maxEnd) return `The end exceeds the video duration (${formatDuration(maxEnd)}, ${maxEnd} s).`;
  if (startSec >= endSec) return "The start must be before the end.";
  if (endSec - startSec < 1) return "The interval must be at least 1 second long.";
  return null;
}

/** REQ-VID-TRIM-010: default name of the result. */
export function defaultTrimName(video: Pick<Video, "name">, startSec: number, endSec: number): string {
  return `${video.name.replace(/\.(mp4|mov)$/i, "")}_recorte_${startSec}-${endSec}`;
}

// ------------------------------------------------------------------ helpers

const MB = 1024 * 1024;
const GB = 1024 * MB;

export function formatBytes(bytes: number): string {
  if (bytes >= GB) return `${(bytes / GB).toFixed(bytes % GB === 0 ? 0 : 2)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(bytes % MB === 0 ? 0 : 1)} MB`;
  if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${bytes} B`;
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const total = Math.round(seconds);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function formatResolution(video: Pick<Video, "width" | "height">): string {
  return video.width && video.height ? `${video.width} × ${video.height}` : "—";
}

/** REQ-VID-LIB-041: format identified from the selected file, before upload. */
export function detectVideoFormat(file: File): "MP4" | "MOV" | null {
  const ext = file.name.toLowerCase().split(".").pop();
  if (ext === "mp4") return "MP4";
  if (ext === "mov") return "MOV";
  return null;
}

export const STATUS_LABEL: Record<VideoStatus, string> = {
  uploading: "Uploading",
  validating: "Validating",
  available: "Available",
  rejected: "Rejected",
};

// ------------------------------------------------------------------ messages

type Details = Record<string, unknown> | undefined;
const n = (details: Details, key: string) => Number(details?.[key]);

/** User message for a rejection reason or error code (E1-E13). */
export function describeVideoCode(code: string | undefined, details?: Details): string {
  switch (code) {
    case "unsupported_format":
      return "Unsupported format. Only MP4 and MOV videos are accepted.";
    case "file_too_large":
      return `The file exceeds the maximum size of ${formatBytes(n(details, "limitBytes"))} allowed for your plan.`;
    case "insufficient_storage":
      return `Not enough storage space in your video library (${formatBytes(n(details, "freeBytes"))} free). Delete videos to free up space or upgrade to Premium.`;
    case "unsupported_video_codec":
      return `Unsupported video codec${details?.found ? ` (${String(details.found)})` : ""}. Only H.264 videos are supported.`;
    case "unsupported_audio_codec":
      return `Unsupported audio codec${details?.found ? ` (${String(details.found)})` : ""}. Only AAC audio is supported.`;
    case "corrupted":
      return "The file is corrupted or unreadable and could not be validated.";
    case "duration_exceeded": {
      const limit = n(details, "limitSec");
      return `The video is longer than the maximum of ${formatDuration(limit)} (${limit} s) allowed for your plan.`;
    }
    case "resolution_exceeded": {
      const w = details?.width;
      const h = details?.height;
      return `The video resolution${w && h ? ` (${w} × ${h})` : ""} exceeds the ${String(details?.limitLabel ?? "")} limit of your plan.`;
    }
    case "upload_interrupted":
    case "upload_incomplete":
      return "The upload was interrupted by a connection failure. Please try again.";
    case "upload_cancelled":
      return "The upload was cancelled.";
    case "storage_failure":
      return "The video could not be saved because of a storage failure. Please try again.";
    case "session_expired":
      return "Your session expired before the upload finished. Please sign in again.";
    case "video_in_use":
      return "This video is being used by an operation in progress. It can only be deleted once the operation is completed, failed or cancelled.";
    case "anonymous_not_allowed":
      return "The video library and video playback require a registered account.";
    case "forbidden": // E5
      return "You do not have permission to access this resource.";
    // ---- playback (UC-VID-003) ----
    case "browser_codec_unsupported": // E1
      return "Your browser does not support the codec of this video. Please use a compatible browser.";
    case "transmission_error": // E2
      return "Transmission error. Check your internet connection.";
    case "playback_session_expired": // E3b
      return "Your session has expired. Please sign in again to keep watching.";
    // ---- trim (UC-VID-001) ----
    case "unsupported_for_processing": // E1
      return "This video format is not supported for trimming. Accepted formats: MP4 and MOV (H.264).";
    case "processing_in_progress": {
      // E4
      const limit = n(details, "limit");
      return limit > 1
        ? `You already have ${limit} trims in progress. Please wait for one to finish.`
        : "There is already a trim in progress. Please wait for it to finish.";
    }
    case "daily_quota_exhausted": {
      // E3
      const reset = details?.resetAt ? new Date(String(details.resetAt)) : null;
      const at = reset ? ` Your operations reset at ${reset.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}.` : "";
      return `You reached the daily operations limit.${at} Upgrade to Premium for unlimited operations.`;
    }
    case "insufficient_storage_for_result": // E7 (estimate)
      return `There is not enough space in your library for the trimmed video (about ${formatBytes(n(details, "estimatedBytes"))} needed, ${formatBytes(n(details, "freeBytes"))} free). Delete videos to free up space or upgrade to Premium.`;
    case "insufficient_storage": // E7 (real size at the end)
      return "The trimmed video did not fit in the free space of your library. The operation was returned to your daily quota.";
    case "invalid_interval":
      return "The selected interval is not valid.";
    case "full_copy_confirmation_required":
      return "The interval covers the whole video, so the result would be a copy of the original.";
    case "cannot_cancel_request":
      return "This request has already finished and can no longer be cancelled.";
    case "processing_failed":
    case "invalid_result":
    case "source_unavailable": // E5
      return "Could not complete the trim. Please try again.";
    case "storage_load_failed":
      return `The video could not be loaded from storage (HTTP ${String(details?.status ?? "error")}).`;
    case "video_unavailable": // E4
      return "The video is no longer available.";
    case "video_corrupted": // E6
      return "The video could not be played because the file is corrupted or incomplete.";
    case "stream_limit_reached": {
      // E7
      const limit = n(details, "limit");
      const upgrade = details?.profile === "free" ? " or upgrade to Premium" : "";
      return `Your plan allows ${limit} video${limit === 1 ? "" : "s"} playing at the same time. Close an active playback${upgrade} to watch this one.`;
    }
    case "playback_session_ended":
      return "This video started playing in another window, so this player was stopped.";
    case "cannot_cancel":
      return "The upload can no longer be cancelled: the video is already being validated.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Extracts code + message from an axios error. */
export function describeVideoError(error: unknown): { code: string; message: string } {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      // E10: no response at all -> connection failure
      return { code: "upload_interrupted", message: describeVideoCode("upload_interrupted") };
    }
    const data = error.response.data as { code?: string; details?: Details } | undefined;
    const code = data?.code ?? "unknown";
    return { code, message: describeVideoCode(code, data?.details) };
  }
  return { code: "unknown", message: describeVideoCode(undefined) };
}
