"use client";

// In-app notification of finished trims - UC-VID-001 step 12, FA3, E5
// (REQ-VID-TRIM-023, 035, 047). Mounted in the dashboard sidebar so it works
// on every dashboard page; finished requests not yet notified (e.g. while the
// user was away) are shown once and marked as seen.
import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "@/providers/session-provider";
import { useGetTrims, videoLibraryKey } from "@/lib/queries/videos";
import { refreshSessionOperations } from "@/lib/mutations/videos";
import { describeVideoCode, markTrimSeen } from "@/lib/videos";

export default function TrimNotifier() {
  const session = useSession();
  const uid = session.user._id;
  const token = session.token;
  const enabled = session.user.type !== "anonymous";
  const trims = useGetTrims(uid, token, enabled);
  const qc = useQueryClient();
  const { toast } = useToast();
  const notified = useRef(new Set<string>());

  useEffect(() => {
    if (!trims.data) return;
    const finished = trims.data.filter(
      (j) => !j.seen && (j.status === "completed" || j.status === "failed") && !notified.current.has(j._id),
    );
    if (finished.length === 0) return;

    for (const job of finished) {
      notified.current.add(job._id);
      if (job.status === "completed") {
        toast({ title: "Trim completed", description: `"${job.params.name}" is now in your video library.` });
      } else {
        toast({
          title: "Trim failed",
          description: describeVideoCode(job.error?.code, job.error?.details),
          variant: "destructive",
        });
      }
      void markTrimSeen(uid, token, job._id).catch(() => {});
    }
    qc.invalidateQueries({ queryKey: videoLibraryKey(uid, token) });
    void refreshSessionOperations(qc); // a failed trim returns the operation
  }, [trims.data, uid, token, qc, toast]);

  return null;
}
