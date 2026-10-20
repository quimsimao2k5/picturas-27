"use client";

// Trim screen - UC-VID-001 steps 2-8 (+ FA1, E1-E4, E7).
import { useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, OctagonAlert, Scissors } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { trimsKey, videoLibraryKey } from "@/lib/queries/videos";
import { refreshSessionOperations } from "@/lib/mutations/videos";
import {
  checkTrimEligibility,
  createTrim,
  defaultTrimName,
  describeVideoError,
  formatDuration,
  trimMaxEnd,
  validateTrimInterval,
  Video,
} from "@/lib/videos";
import VideoPlayer from "./video-player";

export default function TrimVideoDialog({ video }: { video: Video }) {
  const session = useSession();
  const uid = session.user._id;
  const token = session.token;
  const qc = useQueryClient();
  const { toast } = useToast();

  const maxEnd = trimMaxEnd(video);
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [start, setStart] = useState("0");
  const [end, setEnd] = useState(String(maxEnd));
  const [format, setFormat] = useState<"mp4" | "mov">(video.format);
  const [name, setName] = useState("");
  const [confirmFull, setConfirmFull] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<{ code: string; message: string } | null>(null);

  const startSec = Number(start);
  const endSec = Number(end);
  const intervalError = useMemo(() => validateTrimInterval(startSec, endSec, maxEnd), [startSec, endSec, maxEnd]);
  const isFullVideo = !intervalError && startSec === 0 && endSec === maxEnd;
  const resultName = name.trim() || defaultTrimName(video, startSec, endSec);

  // Step 2: E1 / E4 are checked before the screen opens (REQ-VID-TRIM-036, 043)
  const openScreen = async () => {
    setChecking(true);
    try {
      await checkTrimEligibility(uid, token, video._id);
      setStart("0");
      setEnd(String(maxEnd));
      setFormat(video.format);
      setName("");
      setError(null);
      setOpen(true);
    } catch (err) {
      toast({ title: "Cannot trim this video", description: describeVideoError(err).message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  // Steps 6-8
  const submit = async (confirmFullCopy: boolean) => {
    setSubmitting(true);
    setError(null);
    try {
      await createTrim({
        uid,
        token,
        videoId: video._id,
        startSec,
        endSec,
        outputFormat: format,
        name: name.trim() || undefined,
        confirmFullCopy,
      });
      toast({ title: "Trim queued", description: `"${resultName}" will appear in your library when it is ready.` });
      setOpen(false); // REQ-VID-TRIM-015: back to the library
      qc.invalidateQueries({ queryKey: trimsKey(uid, token) });
      qc.invalidateQueries({ queryKey: videoLibraryKey(uid, token) });
      void refreshSessionOperations(qc); // REQ-VID-TRIM-002: reserved operation
    } catch (err) {
      setError(describeVideoError(err)); // E3, E4, E7, E2 (server)
    } finally {
      setSubmitting(false);
    }
  };

  const onStartTrim = () => {
    if (isFullVideo) setConfirmFull(true); // FA1 / REQ-VID-TRIM-026
    else void submit(false);
  };

  return (
    <>
      <Button size="sm" variant="ghost" onClick={openScreen} disabled={checking} aria-label={`Trim ${video.name}`}>
        {checking ? <LoaderCircle className="animate-spin" /> : <Scissors />} Trim
      </Button>

      <Dialog open={open} onOpenChange={(v) => !submitting && setOpen(v)}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="truncate pr-6">Trim “{video.name}”</DialogTitle>
            <DialogDescription>Total duration {formatDuration(video.durationSec)} · 1 second precision</DialogDescription>
          </DialogHeader>

          {/* Step 3 / REQ-VID-TRIM-004: player and total duration */}
          {open && <VideoPlayer video={video} onUnavailable={() => setOpen(false)} />}

          {/* Step 4: interval (REQ-VID-TRIM-005, 006, 037-041) */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <Label htmlFor="trim-start">Start (seconds)</Label>
              <Input id="trim-start" type="number" min={0} max={maxEnd} step={1} value={start} onChange={(e) => setStart(e.target.value)} />
              <span className="text-xs text-muted-foreground">{Number.isFinite(startSec) ? formatDuration(startSec) : "—"}</span>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="trim-end">End (seconds)</Label>
              <Input id="trim-end" type="number" min={1} max={maxEnd} step={1} value={end} onChange={(e) => setEnd(e.target.value)} />
              <span className="text-xs text-muted-foreground">{Number.isFinite(endSec) ? formatDuration(endSec) : "—"}</span>
            </div>

            {/* Step 5: format and name (REQ-VID-TRIM-007..010) */}
            <div className="flex flex-col gap-1">
              <Label htmlFor="trim-format">Output format</Label>
              <select
                id="trim-format"
                className="h-9 rounded-md border bg-background px-3 text-sm"
                value={format}
                onChange={(e) => setFormat(e.target.value as "mp4" | "mov")}
              >
                <option value="mp4">MP4</option>
                <option value="mov">MOV</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <Label htmlFor="trim-name">Name of the new video (optional)</Label>
              <Input
                id="trim-name"
                value={name}
                maxLength={200}
                placeholder={Number.isFinite(startSec) && Number.isFinite(endSec) ? defaultTrimName(video, startSec, endSec) : ""}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          {intervalError ? (
            <Alert variant="destructive">
              <OctagonAlert className="size-4" />
              <AlertTitle>Invalid interval</AlertTitle>
              <AlertDescription data-testid="trim-interval-error">{intervalError}</AlertDescription>
            </Alert>
          ) : (
            // REQ-VID-TRIM-011: summary of the request
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 rounded-md border p-3 text-sm" data-testid="trim-summary">
              <span className="text-muted-foreground">Source</span>
              <span className="truncate">{video.name}</span>
              <span className="text-muted-foreground">Interval</span>
              <span>
                {formatDuration(startSec)} → {formatDuration(endSec)}
              </span>
              <span className="text-muted-foreground">Result duration</span>
              <span>
                {formatDuration(endSec - startSec)} ({endSec - startSec} s)
              </span>
              <span className="text-muted-foreground">Format</span>
              <span>{format.toUpperCase()}</span>
              <span className="text-muted-foreground">Name</span>
              <span className="truncate">{resultName}</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <OctagonAlert className="size-4" />
              <AlertTitle>Could not start the trim</AlertTitle>
              <AlertDescription>
                {error.message}
                {(error.code === "daily_quota_exhausted" || error.code === "insufficient_storage_for_result") &&
                  session.user.type === "free" && (
                    <Button asChild variant="link" className="h-auto px-1">
                      <Link href="/dashboard/account/upgrade">Upgrade to Premium</Link>
                    </Button>
                  )}
              </AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            {/* REQ-VID-TRIM-012 / 040: disabled while the interval is invalid */}
            <Button onClick={onStartTrim} disabled={!!intervalError || submitting}>
              {submitting ? <LoaderCircle className="animate-spin" /> : <Scissors />} Start Trim
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FA1: whole video selected */}
      <AlertDialog open={confirmFull} onOpenChange={setConfirmFull}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Copy of the original?</AlertDialogTitle>
            <AlertDialogDescription>
              The interval covers the whole video, so the result would be a copy of the original and still use one daily
              operation. Do you want to continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            {/* REQ-VID-TRIM-027: back to the interval */}
            <AlertDialogCancel>Change interval</AlertDialogCancel>
            <AlertDialogAction onClick={() => void submit(true)}>Continue</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
