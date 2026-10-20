"use client";

// Step 13 / REQ-VID-TRIM-025: download a video of the library. The signed URL
// is same-origin (nginx /s3), so the browser honours the "download" name.
import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { describeVideoError, fetchDownloadUrl } from "@/lib/videos";

export default function DownloadVideoButton({ videoId, label = "Download" }: { videoId: string; label?: string }) {
  const session = useSession();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const { url, fileName } = await fetchDownloadUrl(session.user._id, session.token, videoId);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast({ title: "Could not download the video", description: describeVideoError(err).message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="sm" variant="ghost" onClick={download} disabled={busy} aria-label={label}>
      {busy ? <LoaderCircle className="animate-spin" /> : <Download />} {label}
    </Button>
  );
}
