import { useQuery } from "@tanstack/react-query";
import { fetchTrims, fetchVideoLibrary, TrimJob, VideoLibrary } from "../videos";

export const videoLibraryKey = (uid: string, token: string) => ["videoLibrary", uid, token];

/**
 * Video library (UC-VID-002 step 1). While some upload is still "uploading" or
 * "validating" the library is refreshed every 2 s, so a result produced in the
 * background (FA6) shows up without reloading the page.
 */
export const useGetVideoLibrary = (uid: string, token: string, enabled = true) => {
  return useQuery<VideoLibrary>({
    queryKey: videoLibraryKey(uid, token),
    queryFn: () => fetchVideoLibrary(uid, token),
    enabled: enabled && !!uid && !!token,
    refetchInterval: (query) =>
      query.state.data?.recent.some((v) => v.status === "uploading" || v.status === "validating")
        ? 2000
        : false,
  });
};

export const trimsKey = (uid: string, token: string) => ["videoTrims", uid, token];

/**
 * Trim requests (UC-VID-001 step 10). Refreshed every 3 s while a request is
 * queued or processing (RN8 / REQ-VID-TRIM-053: progress at least every 5 s),
 * every 30 s otherwise so results produced while away show up (FA3).
 */
export const useGetTrims = (uid: string, token: string, enabled = true) => {
  return useQuery<TrimJob[]>({
    queryKey: trimsKey(uid, token),
    queryFn: () => fetchTrims(uid, token),
    enabled: enabled && !!uid && !!token,
    refetchInterval: (query) =>
      query.state.data?.some((j) => j.status === "queued" || j.status === "processing") ? 3000 : 30000,
  });
};
