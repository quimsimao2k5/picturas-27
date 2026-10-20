import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cancelTrim, deleteVideo, dismissVideo } from "../videos";
import { SessionData, validateSession } from "../session";
import { trimsKey, videoLibraryKey } from "../queries/videos";

/** FA5: delete an available video. */
export const useDeleteVideo = (uid: string, token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => deleteVideo({ uid, token, videoId }),
    onSettled: () => qc.invalidateQueries({ queryKey: videoLibraryKey(uid, token) }),
  });
};

/** FA7: dismiss the notice of a rejected video. */
export const useDismissVideo = (uid: string, token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (videoId: string) => dismissVideo({ uid, token, videoId }),
    onSettled: () => qc.invalidateQueries({ queryKey: videoLibraryKey(uid, token) }),
  });
};

/**
 * Refreshes the session so the remaining daily operations shown in the app
 * are up to date after a trim reserves or returns an operation (same pattern
 * as the existing project processing).
 */
export async function refreshSessionOperations(qc: ReturnType<typeof useQueryClient>) {
  try {
    const raw = localStorage.getItem("session");
    if (!raw) return;
    const current = JSON.parse(raw) as SessionData;
    const updated = await validateSession({ userId: current.user._id, token: current.token });
    const next: SessionData = { user: updated.user, token: updated.token };
    localStorage.setItem("session", JSON.stringify(next));
    qc.setQueryData(["session"], next);
    window.dispatchEvent(new Event("session-updated"));
  } catch {
    // not critical: the counter is refreshed on the next session validation
  }
}

/** FA2: cancel a trim request (the operation goes back to the quota). */
export const useCancelTrim = (uid: string, token: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => cancelTrim({ uid, token, jobId }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: trimsKey(uid, token) });
      void refreshSessionOperations(qc);
    },
  });
};
