"use client";

// UC-VID-002 main flow, steps 2-9 (+ FA1, FA2, FA3, FA6, E2-E12).
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Film, LoaderCircle, OctagonAlert, Upload } from "lucide-react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import {
  cancelVideoUpload,
  createVideoUpload,
  describeVideoCode,
  describeVideoError,
  detectVideoFormat,
  formatBytes,
  uploadVideoContent,
  VideoLimits,
} from "@/lib/videos";
import { videoLibraryKey } from "@/lib/queries/videos";

type Phase = "select" | "starting" | "uploading" | "validating" | "error";

export default function UploadVideoDialog({ limits }: { limits?: VideoLimits }) {
  const session = useSession();
  const uid = session.user._id;
  const token = session.token;
  const qc = useQueryClient();
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const videoIdRef = useRef<string | null>(null);
  // Incremented on every reset: a submission started before a reset (e.g. the
  // dialog was closed while validating - FA6) must not update the new state.
  const runRef = useRef(0);

  const refreshLibrary = () => qc.invalidateQueries({ queryKey: videoLibraryKey(uid, token) });

  const reset = () => {
    runRef.current += 1;
    setFile(null);
    setPhase("select");
    setProgress(0);
    setError(null);
    abortRef.current = null;
    videoIdRef.current = null;
    if (inputRef.current) inputRef.current.value = "";
  };

  // Steps 3 / FA3: select (or replace) the file and show name, format and size.
  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
    setError(null);
    setPhase("select");
  };

  const format = file ? detectVideoFormat(file) : null;
  // Preliminary client-side hints; the server repeats every check (A5).
  const clientWarning = !file
    ? null
    : !format
      ? describeVideoCode("unsupported_format")
      : limits && file.size > limits.maxFileBytes
        ? describeVideoCode("file_too_large", { limitBytes: limits.maxFileBytes })
        : null;

  // Step 4 onwards.
  const submit = async () => {
    if (!file) return;
    const run = runRef.current;
    const current = () => runRef.current === run;
    setError(null);
    setPhase("starting");

    let videoId: string;
    try {
      const created = await createVideoUpload({ uid, token, file });
      videoId = created._id;
      videoIdRef.current = videoId;
    } catch (err) {
      if (!current()) return;
      setError(describeVideoError(err)); // E2, E3, E4 - no record was created
      setPhase("error");
      return;
    }
    if (!current()) return;

    refreshLibrary();
    const controller = new AbortController();
    abortRef.current = controller;
    setProgress(0);
    setPhase("uploading");

    try {
      const video = await uploadVideoContent({
        uid,
        token,
        videoId,
        file,
        signal: controller.signal,
        onProgress: (percent) => {
          if (!current()) return;
          setProgress(percent);
          // Whole file sent: the server is validating, cancel is no longer
          // available (REQ-VID-LIB-012).
          if (percent >= 100) setPhase("validating");
        },
      });

      if (video.status === "available") {
        // Shown even if the dialog was closed meanwhile (FA6).
        toast({ title: "Video added", description: `"${video.name}" is now available in your library.` });
        if (current()) {
          setOpen(false);
          reset();
        }
      } else if (current()) {
        setError({
          code: video.rejection?.code ?? "unknown",
          message: describeVideoCode(video.rejection?.code, video.rejection?.details),
        });
        setPhase("error");
      }
    } catch (err) {
      if (!current()) {
        // dialog already reset - the library panel shows the outcome
      } else if (controller.signal.aborted) {
        // FA2 - user cancelled: nothing else to show.
        reset();
        setOpen(false);
      } else {
        setError(describeVideoError(err)); // E10, E11, E12
        setPhase("error");
      }
    } finally {
      refreshLibrary();
    }
  };

  // FA2: cancel while uploading.
  const cancelUpload = async () => {
    abortRef.current?.abort();
    if (videoIdRef.current) {
      // The aborted request is enough for the server to clean up; this call
      // makes it explicit (it may 404 if cleanup already happened).
      await cancelVideoUpload(uid, token, videoIdRef.current).catch(() => {});
    }
    toast({ title: "Upload cancelled" });
    refreshLibrary();
  };

  const busy = phase === "starting" || phase === "uploading";

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        // While uploading the dialog can only be left with "Cancel upload".
        if (!value && busy) return;
        setOpen(value);
        // FA6: closing while validating keeps the processing on the server;
        // the result appears in the library / recent uploads panel.
        if (!value) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button className="inline-flex">
          <Upload /> Upload Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription>
            MP4 or MOV, H.264 video with AAC audio (or no audio).
            {limits &&
              ` Up to ${formatBytes(limits.maxFileBytes)}, ${Math.round(limits.maxDurationSec / 60)} min and ${limits.resolutionLabel} on your plan.`}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.mov,video/mp4,video/quicktime"
          className="hidden"
          onChange={onFileChange}
          data-testid="video-file-input"
        />

        {!file ? (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-8 text-muted-foreground hover:bg-accent"
          >
            <Film className="size-10" />
            <span>Choose a video file from your device</span>
          </button>
        ) : (
          <div className="flex flex-col gap-3 rounded-md border p-4">
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
              <span className="text-muted-foreground">Name</span>
              <span className="truncate font-medium" title={file.name}>
                {file.name}
              </span>
              <span className="text-muted-foreground">Format</span>
              <span>{format ?? "Unsupported"}</span>
              <span className="text-muted-foreground">Size</span>
              <span>{formatBytes(file.size)}</span>
            </div>

            {(phase === "uploading" || phase === "validating") && (
              <div className="flex flex-col gap-1">
                <Progress value={progress} />
                <span className="text-xs text-muted-foreground">
                  {phase === "uploading" ? `Uploading… ${progress}%` : "Validating video… you can close this window."}
                </span>
              </div>
            )}
          </div>
        )}

        {clientWarning && phase === "select" && (
          <Alert>
            <OctagonAlert className="size-4" />
            <AlertTitle>Check the selected file</AlertTitle>
            <AlertDescription>{clientWarning}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <OctagonAlert className="size-4" />
            <AlertTitle>{error.code === "insufficient_storage" ? "Not enough space" : "Upload failed"}</AlertTitle>
            <AlertDescription>
              {error.message}
              {error.code === "session_expired" && (
                <Button asChild variant="link" className="px-1 h-auto">
                  <Link href="/login">Sign in</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter className="gap-2">
          {phase === "uploading" ? (
            <Button variant="destructive" onClick={cancelUpload}>
              Cancel upload
            </Button>
          ) : phase === "validating" ? (
            <Button disabled>
              <LoaderCircle className="animate-spin" /> Validating
            </Button>
          ) : (
            <>
              {/* FA1: cancel before the upload starts */}
              <Button
                variant="outline"
                disabled={phase === "starting"}
                onClick={() => {
                  reset();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              {file && (
                <Button variant="outline" disabled={phase === "starting"} onClick={() => inputRef.current?.click()}>
                  Change file
                </Button>
              )}
              <Button disabled={!file || phase === "starting"} onClick={submit}>
                {phase === "starting" && <LoaderCircle className="animate-spin" />}
                {phase === "error" ? "Try again" : "Upload"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
