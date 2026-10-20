"use client";

// Trim requests panel - UC-VID-001 steps 9-13, FA2 (REQ-VID-TRIM-017..019,
// 024, 025, 028-033, 047).
import { LoaderCircle, Play, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { useCancelTrim } from "@/lib/mutations/videos";
import { describeVideoCode, describeVideoError, formatDuration, TRIM_STATUS_LABEL, TrimJob, Video } from "@/lib/videos";
import VideoPlayerDialog from "./video-player-dialog";
import DownloadVideoButton from "./download-video-button";

export default function ProcessingRequests({ jobs, videos }: { jobs: TrimJob[]; videos: Video[] }) {
  const session = useSession();
  const cancel = useCancelTrim(session.user._id, session.token);
  const { toast } = useToast();

  if (jobs.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Processing requests</CardTitle>
        <CardDescription>Your recent trims. You can leave this page: processing continues in the background.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {jobs.map((job) => {
          const active = job.status === "queued" || job.status === "processing";
          const result = job.resultVideoId ? videos.find((v) => v._id === job.resultVideoId) : undefined;
          return (
            <div key={job._id} className="flex flex-col gap-2 rounded-md border p-3" data-testid="trim-request">
              <div className="flex flex-wrap items-center gap-3">
                {active && <LoaderCircle className="size-5 animate-spin text-muted-foreground shrink-0" />}
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-medium" title={job.params.name}>
                    {job.params.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    From {job.sourceName ?? "video"} · {formatDuration(job.params.startSec)}–{formatDuration(job.params.endSec)} ·{" "}
                    {job.params.outputFormat.toUpperCase()}
                  </span>
                </div>
                <Badge variant={job.status === "failed" ? "destructive" : job.status === "completed" ? "default" : "secondary"}>
                  {TRIM_STATUS_LABEL[job.status]}
                  {job.status === "processing" ? ` ${job.progress}%` : ""}
                </Badge>

                {active && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="ghost" disabled={cancel.isPending}>
                        <X /> Cancel
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Cancel this trim?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Any progress will be discarded and the operation will be returned to your daily quota.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Keep processing</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() =>
                            cancel.mutate(job._id, {
                              onSuccess: () => toast({ title: "Trim cancelled" }),
                              onError: (err) =>
                                toast({ title: "Could not cancel", description: describeVideoError(err).message, variant: "destructive" }),
                            })
                          }
                        >
                          Cancel trim
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {/* Step 13: play and download the result (REQ-VID-TRIM-024/025, REQ-VID-PLAY-038) */}
                {job.status === "completed" && result && (
                  <>
                    <VideoPlayerDialog video={result} />
                    <DownloadVideoButton videoId={result._id} />
                  </>
                )}
                {job.status === "completed" && !result && (
                  <span className="text-xs text-muted-foreground">
                    <Play className="inline size-3" /> Result removed from the library
                  </span>
                )}
              </div>

              {job.status === "processing" && <Progress value={job.progress} />}
              {job.status === "queued" && <span className="text-xs text-muted-foreground">Waiting for processing capacity…</span>}
              {job.status === "failed" && (
                <span className="text-xs text-destructive">{describeVideoCode(job.error?.code, job.error?.details)}</span>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
