"use client";

// Web player - UC-VID-003 (steps 2-5, FA2, FA3, FA4, E1-E7).
// The <video> element reads the file straight from the object store through
// a temporary signed URL (RN2) using HTTP Range requests, so playback starts
// without downloading the whole file (REQ-VID-PLAY-006) and seeking only
// fetches the needed segment (REQ-VID-PLAY-010).
import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import Link from "next/link";
import {
  LoaderCircle,
  Maximize,
  Minimize,
  OctagonAlert,
  Pause,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSession } from "@/providers/session-provider";
import {
  describeVideoCode,
  formatDuration,
  playbackHeartbeat,
  renewPlayback,
  startPlayback,
  stopPlayback,
  Video,
} from "@/lib/videos";

type PlayerState = "loading" | "buffering" | "playing" | "paused" | "ended" | "error";
type PlayerError = { code: string; message: string; retry: boolean };

const SPEEDS = [0.5, 1, 1.5, 2]; // A5 / REQ-VID-PLAY-042
const NETWORK_TIMEOUT_MS = 8000; // E2 detected <= 10 s after the buffer runs out (REQ-VID-PLAY-036)
const RENEW_BEFORE_MS = 60_000; // E3a: fetch a fresh URL 1 min before expiry

const STATE_LABEL: Record<PlayerState, string> = {
  loading: "Loading",
  buffering: "Buffering",
  playing: "Playing",
  paused: "Paused",
  ended: "Ended",
  error: "Error",
};

/** Maps an API error of the playback endpoints to a player error. */
function apiError(err: unknown): PlayerError {
  if (axios.isAxiosError(err)) {
    if (!err.response) return { code: "transmission_error", message: describeVideoCode("transmission_error"), retry: true };
    if (err.response.status === 401) {
      // E3b: JWT expired or revoked (refused by the gateway)
      return { code: "playback_session_expired", message: describeVideoCode("playback_session_expired"), retry: false };
    }
    const data = err.response.data as { code?: string; details?: Record<string, unknown> } | undefined;
    const code = data?.code ?? "unknown";
    return { code, message: describeVideoCode(code, data?.details), retry: code === "storage_unavailable" };
  }
  return { code: "unknown", message: describeVideoCode(undefined), retry: true };
}

export default function VideoPlayer({
  video,
  onUnavailable,
}: {
  video: Video;
  /** E4: the video no longer exists - the library list must be refreshed (REQ-VID-PLAY-023). */
  onUnavailable: () => void;
}) {
  const session = useSession();
  const uid = session.user._id;
  const token = session.token;

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const sessionIdRef = useRef<string | null>(null);
  const urlRef = useRef<{ url: string; expiresAt: number } | null>(null);
  const metadataLoadedRef = useRef(false);
  const resumeRef = useRef<{ time: number; play: boolean } | null>(null);
  const lastRecoveryRef = useRef(0);
  const lastProgressRef = useRef(Date.now());
  const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const renewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);

  const [state, setState] = useState<PlayerState>("loading");
  const [error, setError] = useState<PlayerError | null>(null);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(video.durationSec ?? 0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [fullscreen, setFullscreen] = useState(false);

  const clearWaitTimer = () => {
    if (waitTimerRef.current) clearTimeout(waitTimerRef.current);
    waitTimerRef.current = null;
  };

  /** Stops everything and shows an error, keeping the current instant t. */
  const fail = useCallback(
    (err: PlayerError) => {
      clearWaitTimer();
      const el = videoRef.current;
      if (el) {
        resumeRef.current = { time: el.currentTime, play: !el.paused };
        el.pause();
      }
      setError(err);
      setState("error");
      if (err.code === "video_unavailable") onUnavailable();
    },
    [onUnavailable],
  );

  /**
   * E3a: renews the signed URL in the background 1 min before it expires.
   * While paused the new URL replaces the old one right away (invisible to
   * the user); while playing it is applied if the browser later reports an
   * error for the expired URL (see onMediaError -> recover).
   */
  const scheduleRenewal = useCallback(
    (expiresAt: number) => {
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      const wait = Math.max(5_000, expiresAt - Date.now() - RENEW_BEFORE_MS);
      renewTimerRef.current = setTimeout(async () => {
        if (!sessionIdRef.current || stoppedRef.current) return;
        try {
          const fresh = await renewPlayback(uid, token, sessionIdRef.current);
          const freshExpiry = Date.parse(fresh.expiresAt);
          const el = videoRef.current;
          if (el && el.paused && !el.ended) loadSource(fresh.url, freshExpiry, { time: el.currentTime, play: false });
          else urlRef.current = { url: fresh.url, expiresAt: freshExpiry };
          scheduleRenewal(freshExpiry);
        } catch (err) {
          const e = apiError(err);
          // E3b / E4 are reported immediately; network issues are retried on demand.
          if (e.code !== "transmission_error") fail(e);
        }
      }, wait);
    },
    [uid, token, fail],
  );

  /** Loads a (new) signed URL, keeping position and play state. */
  const loadSource = (url: string, expiresAt: number, resume: { time: number; play: boolean } | null) => {
    const el = videoRef.current;
    if (!el) return;
    urlRef.current = { url, expiresAt };
    resumeRef.current = resume;
    el.src = url;
    el.load();
  };

  /**
   * E2 retry / E3a renewal / E4 detection: always asks the server for a new
   * signed URL - which re-validates that the video still exists - and resumes
   * from the preserved instant t (REQ-VID-PLAY-020, 021, 022).
   */
  const recover = useCallback(
    async () => {
      const el = videoRef.current;
      if (!el || !sessionIdRef.current) return;
      const resume = resumeRef.current ?? { time: el.currentTime, play: !el.paused };
      lastRecoveryRef.current = Date.now();
      setError(null);
      setState("buffering");
      try {
        const r = await renewPlayback(uid, token, sessionIdRef.current);
        const expiresAt = Date.parse(r.expiresAt);
        scheduleRenewal(expiresAt);
        loadSource(r.url, expiresAt, resume);
      } catch (err) {
        resumeRef.current = resume;
        fail(apiError(err));
      }
    },
    [uid, token, scheduleRenewal, fail],
  );

  // ---- step 2: start the playback when the player opens ----
  useEffect(() => {
    stoppedRef.current = false;
    let heartbeat: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const start = await startPlayback(uid, token, video._id);
        if (stoppedRef.current) {
          stopPlayback(uid, token, start.sessionId);
          return;
        }
        sessionIdRef.current = start.sessionId;
        const expiresAt = Date.parse(start.expiresAt);
        scheduleRenewal(expiresAt);
        loadSource(start.url, expiresAt, { time: 0, play: true });

        heartbeat = setInterval(async () => {
          if (!sessionIdRef.current) return;
          try {
            await playbackHeartbeat(uid, token, sessionIdRef.current);
          } catch (err) {
            const e = apiError(err);
            if (e.code === "playback_session_ended" || e.code === "playback_session_expired") {
              sessionIdRef.current = null;
              fail(e);
            }
          }
        }, start.heartbeatIntervalSec * 1000);
      } catch (err) {
        fail(apiError(err));
      }
    })();

    // step 5 / FA3: release the stream also when the page is closed
    const onPageHide = () => {
      if (sessionIdRef.current) stopPlayback(uid, token, sessionIdRef.current);
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      stoppedRef.current = true;
      window.removeEventListener("pagehide", onPageHide);
      if (heartbeat) clearInterval(heartbeat);
      if (renewTimerRef.current) clearTimeout(renewTimerRef.current);
      clearWaitTimer();
      // REQ-VID-PLAY-015: cancel pending transfers and free the buffer
      const el = videoRef.current;
      if (el) {
        el.pause();
        el.removeAttribute("src");
        el.load();
      }
      if (sessionIdRef.current) stopPlayback(uid, token, sessionIdRef.current);
      sessionIdRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video._id]);

  useEffect(() => {
    const onFs = () => setFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  // ---- media events ----
  const updateBuffered = () => {
    const el = videoRef.current;
    if (!el || el.buffered.length === 0) return;
    let end = 0;
    for (let i = 0; i < el.buffered.length; i++) {
      if (el.buffered.start(i) <= el.currentTime + 0.5) end = Math.max(end, el.buffered.end(i));
    }
    setBuffered(end);
  };

  const onLoadedMetadata = () => {
    const el = videoRef.current;
    if (!el) return;
    metadataLoadedRef.current = true;
    if (Number.isFinite(el.duration)) setDuration(el.duration);
    el.playbackRate = rate;
    el.volume = volume;
    el.muted = muted;
    const resume = resumeRef.current;
    resumeRef.current = null;
    if (resume && resume.time > 0) el.currentTime = resume.time;
    if (!resume || resume.play) {
      el.play().catch(() => setState("paused")); // autoplay may be blocked by the browser
    } else setState("paused");
  };

  const onWaiting = () => {
    if (state === "error") return;
    setState("buffering"); // REQ-VID-PLAY-043
    clearWaitTimer();
    // E2: buffer exhausted and no data arriving -> transmission error
    waitTimerRef.current = setTimeout(() => {
      const stalledFor = Date.now() - lastProgressRef.current;
      if (!navigator.onLine || stalledFor >= NETWORK_TIMEOUT_MS) {
        fail({ code: "transmission_error", message: describeVideoCode("transmission_error"), retry: true });
      }
    }, NETWORK_TIMEOUT_MS);
  };

  /** E1 only if the file itself can be read; otherwise report the HTTP error. */
  const probeThenFail = async () => {
    const url = urlRef.current?.url;
    try {
      const res = url ? await fetch(url, { headers: { Range: "bytes=0-1" } }) : null;
      if (res && !res.ok) {
        return fail({
          code: "storage_load_failed",
          message: describeVideoCode("storage_load_failed", { status: res.status }),
          retry: true,
        });
      }
    } catch {
      return fail({ code: "transmission_error", message: describeVideoCode("transmission_error"), retry: true });
    }
    fail({ code: "browser_codec_unsupported", message: describeVideoCode("browser_codec_unsupported"), retry: false });
  };

  const onMediaError = () => {
    const el = videoRef.current;
    const code = el?.error?.code;
    if (!el || code === undefined || code === 1 /* aborted */ || stoppedRef.current) return;
    if (!metadataLoadedRef.current && code === 4 /* SRC_NOT_SUPPORTED */) {
      // Could be E1 (codec) or an expired/removed file: the renewal re-checks
      // the video on the server.
      if (Date.now() - lastRecoveryRef.current > 30_000) return void recover();
      // Still failing: check whether the storage refused the request before
      // blaming the codec, so the user sees the real cause.
      return void probeThenFail();
    }
    if (code === 3 /* DECODE */) {
      return fail({ code: "video_corrupted", message: describeVideoCode("video_corrupted"), retry: false }); // E6
    }
    // NETWORK error or source rejected mid-playback: usually an expired URL
    // (E3a), a deleted video (E4) or a connection problem (E2).
    if (Date.now() - lastRecoveryRef.current > 30_000) return void recover();
    fail({ code: "transmission_error", message: describeVideoCode("transmission_error"), retry: true });
  };

  // ---- controls (step 4) ----
  const togglePlay = () => {
    const el = videoRef.current;
    if (!el || state === "error" || state === "loading") return;
    if (el.paused || el.ended) {
      if (el.ended) el.currentTime = 0; // FA4 replay from 00:00
      el.play().catch(() => {});
    } else el.pause();
  };

  const seek = (value: number) => {
    const el = videoRef.current;
    if (!el) return;
    el.currentTime = value; // FA2: the browser requests the needed range
    setCurrent(value);
  };

  const changeVolume = (value: number) => {
    const el = videoRef.current;
    setVolume(value);
    if (el) {
      el.volume = value;
      if (value > 0 && el.muted) {
        el.muted = false;
        setMuted(false);
      }
    }
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };

  const changeRate = (value: number) => {
    setRate(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen?.();
  };

  const showSpinner = state === "loading" || state === "buffering";
  const max = duration > 0 ? duration : 0;

  return (
    <div ref={containerRef} className="flex flex-col gap-2 bg-background" data-testid="video-player">
      <div className="relative flex items-center justify-center overflow-hidden rounded-md bg-black">
        <video
          ref={videoRef}
          className={fullscreen ? "h-[calc(100vh-4rem)] w-full" : "max-h-[60vh] w-full"}
          playsInline
          preload="auto"
          onClick={togglePlay}
          onLoadedMetadata={onLoadedMetadata}
          onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
          onProgress={() => {
            lastProgressRef.current = Date.now();
            updateBuffered();
          }}
          onWaiting={onWaiting}
          onSeeking={() => setState((s) => (s === "error" ? s : "buffering"))}
          onSeeked={(e) => {
            const paused = e.currentTarget.paused;
            setState((s) => (s === "error" || s === "ended" ? s : paused ? "paused" : "playing"));
          }}
          onPlaying={() => {
            clearWaitTimer();
            setState("playing");
          }}
          onPause={() => setState((s) => (s === "error" || s === "ended" ? s : "paused"))}
          onEnded={() => setState("ended")} // REQ-VID-PLAY-012: stays on the last frame
          onError={onMediaError}
        />

        {showSpinner && !error && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <LoaderCircle className="size-10 animate-spin text-white" aria-label="Buffering" />
          </div>
        )}

        {state === "ended" && (
          <Button className="absolute" onClick={togglePlay}>
            <RotateCcw /> Replay
          </Button>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-6 text-center text-white">
            <OctagonAlert className="size-8" />
            <p className="max-w-md" data-testid="player-error">
              {error.message}
            </p>
            <div className="flex gap-2">
              {error.retry && (
                <Button variant="secondary" onClick={() => recover()}>
                  Try again
                </Button>
              )}
              {(error.code === "playback_session_expired" || error.code === "anonymous_not_allowed") && (
                <Button variant="secondary" asChild>
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
              {error.code === "stream_limit_reached" && session.user.type === "free" && (
                <Button variant="secondary" asChild>
                  <Link href="/dashboard/account/upgrade">Upgrade to Premium</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* progress bar: buffered range + seek (REQ-VID-PLAY-010, 043, 052) */}
      <div className="relative h-4">
        <div className="absolute left-0 right-0 top-1.5 h-1 rounded bg-muted" />
        <div
          className="absolute left-0 top-1.5 h-1 rounded bg-muted-foreground/40"
          style={{ width: max ? `${Math.min(100, (buffered / max) * 100)}%` : 0 }}
        />
        <input
          type="range"
          aria-label="Seek"
          className="absolute inset-0 w-full cursor-pointer accent-primary bg-transparent"
          min={0}
          max={max || 0}
          step={0.1}
          value={Math.min(current, max || 0)}
          disabled={!max || state === "error" || state === "loading"}
          onChange={(e) => seek(Number(e.target.value))}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          onClick={togglePlay}
          disabled={state === "error" || state === "loading"}
          aria-label={state === "playing" || state === "buffering" ? "Pause" : "Play"}
        >
          {state === "playing" || state === "buffering" ? <Pause /> : state === "ended" ? <RotateCcw /> : <Play />}
        </Button>

        <span className="text-sm tabular-nums" data-testid="player-time">
          {formatDuration(current)} / {formatDuration(max)}
        </span>

        <Badge variant={state === "error" ? "destructive" : "secondary"} data-testid="player-state">
          {STATE_LABEL[state]}
        </Badge>

        <div className="ml-auto flex items-center gap-2">
          <Button size="icon" variant="ghost" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {muted || volume === 0 ? <VolumeX /> : <Volume2 />}
          </Button>
          <input
            type="range"
            aria-label="Volume"
            className="w-20 accent-primary"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
          />
          <select
            aria-label="Playback speed"
            className="h-8 rounded-md border bg-background px-2 text-sm"
            value={rate}
            onChange={(e) => changeRate(Number(e.target.value))}
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
          <Button size="icon" variant="ghost" onClick={toggleFullscreen} aria-label="Fullscreen">
            {fullscreen ? <Minimize /> : <Maximize />}
          </Button>
        </div>
      </div>
    </div>
  );
}
