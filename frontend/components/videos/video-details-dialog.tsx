"use client";

// FA4 / REQ-VID-LIB-031: metadata of an available video.
import { Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDuration, formatResolution, Video } from "@/lib/videos";

export default function VideoDetailsDialog({ video }: { video: Video }) {
  const rows: [string, string][] = [
    ["Name", video.name],
    ["ID", video._id],
    ["Format", video.format.toUpperCase()],
    ["Duration", formatDuration(video.durationSec)],
    ["Resolution", formatResolution(video)],
    ["Size", formatBytes(video.sizeBytes)],
    ["Video codec", video.videoCodec ? video.videoCodec.toUpperCase() : "—"],
    ["Audio codec", video.audioCodec ? video.audioCodec.toUpperCase() : "No audio"],
    ["Added", video.availableAt ? new Date(video.availableAt).toLocaleString() : "—"],
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="ghost" aria-label={`Details of ${video.name}`}>
          <Info /> Details
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="truncate pr-6">{video.name}</DialogTitle>
          <DialogDescription>Video details</DialogDescription>
        </DialogHeader>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([label, value]) => (
            <div key={label} className="contents">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="break-all">{value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
