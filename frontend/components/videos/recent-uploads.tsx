"use client";

// RN14 / REQ-VID-LIB-061, 062: uploads in progress and rejected videos are
// shown here, never in the library list.
import { LoaderCircle, OctagonAlert, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { useDismissVideo } from "@/lib/mutations/videos";
import { describeVideoCode, describeVideoError, formatBytes, STATUS_LABEL, Video } from "@/lib/videos";

export default function RecentUploads({ videos }: { videos: Video[] }) {
  const session = useSession();
  const dismiss = useDismissVideo(session.user._id, session.token);
  const { toast } = useToast();

  if (videos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recent uploads</CardTitle>
        <CardDescription>Videos still being processed or that could not be added.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {videos.map((video) => (
          <div
            key={video._id}
            className="flex flex-wrap items-center gap-3 rounded-md border p-3"
            data-testid="recent-upload"
          >
            {video.status === "rejected" ? (
              <OctagonAlert className="size-5 text-destructive shrink-0" />
            ) : (
              <LoaderCircle className="size-5 animate-spin text-muted-foreground shrink-0" />
            )}
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-medium" title={video.name}>
                {video.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {formatBytes(video.sizeBytes)}
                {video.status === "rejected" &&
                  ` · ${describeVideoCode(video.rejection?.code, video.rejection?.details)}`}
              </span>
            </div>
            <Badge variant={video.status === "rejected" ? "destructive" : "secondary"}>
              {STATUS_LABEL[video.status]}
            </Badge>
            {video.status === "rejected" && (
              <Button
                size="sm"
                variant="ghost"
                disabled={dismiss.isPending}
                onClick={() =>
                  dismiss.mutate(video._id, {
                    onError: (err) =>
                      toast({ title: "Could not dismiss", description: describeVideoError(err).message, variant: "destructive" }),
                  })
                }
              >
                <X /> Dismiss
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
