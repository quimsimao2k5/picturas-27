"use client";

// Video Library page - UC-VID-002 (step 1, FA4, FA5, FA6, FA7, E1) and
// entry point of playback - UC-VID-003 (step 1, REQ-VID-PLAY-002/003) and of
// trimming - UC-VID-001 (steps 1-2, 10, 13).
import { Film, OctagonAlert } from "lucide-react";
import { useSession } from "@/providers/session-provider";
import { useGetTrims, useGetVideoLibrary } from "@/lib/queries/videos";
import { describeVideoError, formatBytes, formatDuration, formatResolution } from "@/lib/videos";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SidebarTrigger } from "@/components/ui/sidebar";
import Loading from "@/components/loading";
import UploadVideoDialog from "@/components/videos/upload-video-dialog";
import RecentUploads from "@/components/videos/recent-uploads";
import VideoDetailsDialog from "@/components/videos/video-details-dialog";
import VideoPlayerDialog from "@/components/videos/video-player-dialog";
import TrimVideoDialog from "@/components/videos/trim-video-dialog";
import DownloadVideoButton from "@/components/videos/download-video-button";
import ProcessingRequests from "@/components/videos/processing-requests";
import DeleteVideoButton from "@/components/videos/delete-video-button";
import AnonymousVideoGate from "@/components/videos/anonymous-video-gate";

export default function VideoLibraryPage() {
  const session = useSession();
  const isAnonymous = session.user.type === "anonymous";
  const library = useGetVideoLibrary(session.user._id, session.token, !isAnonymous);
  const trims = useGetTrims(session.user._id, session.token, !isAnonymous);

  if (isAnonymous) return <AnonymousVideoGate />;

  const data = library.data;
  const usedPercent = data ? Math.min(100, (data.storage.usedBytes / data.storage.limitBytes) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 p-4 sm:p-8">
        <header className="flex flex-wrap items-center gap-4">
          <SidebarTrigger variant="outline" className="h-9 w-10 lg:hidden" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Video Library</h1>
            <p className="text-sm text-muted-foreground">
              Upload and manage your videos. Library actions do not use your daily operations.
            </p>
            {/* REQ-VID-TRIM-002: remaining daily operations (Registered profile) */}
            {session.user.type === "free" && session.user.remaining_operations != null && (
              <p className="text-sm" data-testid="remaining-operations">
                Daily operations left: <span className="font-semibold">{session.user.remaining_operations}</span>
              </p>
            )}
          </div>
          <UploadVideoDialog limits={data?.limits} />
        </header>

        {library.isError && (
          <Alert variant="destructive">
            <OctagonAlert className="size-4" />
            <AlertTitle>Could not load your video library</AlertTitle>
            <AlertDescription>{describeVideoError(library.error).message}</AlertDescription>
          </Alert>
        )}

        {/* REQ-VID-LIB-002: storage used vs. plan limit */}
        <Card>
          <CardContent className="flex flex-col gap-2 pt-6">
            <div className="flex justify-between text-sm">
              <span className="font-medium">Storage Used</span>
              {data ? (
                <span data-testid="storage-used">
                  {formatBytes(data.storage.usedBytes)} of {formatBytes(data.storage.limitBytes)}
                </span>
              ) : (
                <Skeleton className="h-4 w-28" />
              )}
            </div>
            <Progress value={usedPercent} />
          </CardContent>
        </Card>

        {data && <RecentUploads videos={data.recent} />}

        {data && trims.data && <ProcessingRequests jobs={trims.data} videos={data.videos} />}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">My videos</CardTitle>
          </CardHeader>
          <CardContent>
            {library.isLoading ? (
              <div className="flex justify-center p-6">
                <Loading />
              </div>
            ) : !data || data.videos.length === 0 ? (
              <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
                <Film className="size-10" />
                <p>Your library has no videos yet. Use &quot;Upload Video&quot; to add one.</p>
              </div>
            ) : (
              <ul className="flex flex-col divide-y" data-testid="video-list">
                {data.videos.map((video) => (
                  <li key={video._id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                    <Film className="size-5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium" title={video.name}>
                      {video.name}
                    </span>
                    <span className="text-sm text-muted-foreground w-12">{video.format.toUpperCase()}</span>
                    <span className="text-sm text-muted-foreground w-16">{formatDuration(video.durationSec)}</span>
                    <span className="text-sm text-muted-foreground w-28">{formatResolution(video)}</span>
                    <span className="text-sm text-muted-foreground w-20">{formatBytes(video.sizeBytes)}</span>
                    <div className="flex gap-1">
                      <VideoPlayerDialog video={video} />
                      <TrimVideoDialog video={video} />
                      <DownloadVideoButton videoId={video._id} />
                      <VideoDetailsDialog video={video} />
                      <DeleteVideoButton video={video} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
