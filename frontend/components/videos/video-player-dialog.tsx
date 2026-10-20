"use client";

// Opens the web player over the library (UC-VID-003 steps 2-5). Closing the
// dialog unmounts the player, which releases the stream and the buffer, and
// returns the user to the library (REQ-VID-PLAY-013, 015).
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSession } from "@/providers/session-provider";
import { videoLibraryKey } from "@/lib/queries/videos";
import { formatResolution, Video } from "@/lib/videos";
import VideoPlayer from "./video-player";

export default function VideoPlayerDialog({ video }: { video: Video }) {
  const session = useSession();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        // REQ-VID-PLAY-023: a deleted video leaves the list when the notice is closed
        if (!value && unavailable) {
          qc.invalidateQueries({ queryKey: videoLibraryKey(session.user._id, session.token) });
          setUnavailable(false);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Play ${video.name}`}>
          <Play /> Play
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{video.name}</DialogTitle>
          <DialogDescription>
            {video.format.toUpperCase()} · {formatResolution(video)}
          </DialogDescription>
        </DialogHeader>
        {open && <VideoPlayer video={video} onUnavailable={() => setUnavailable(true)} />}
      </DialogContent>
    </Dialog>
  );
}
