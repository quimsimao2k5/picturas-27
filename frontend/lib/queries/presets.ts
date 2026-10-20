import { useQuery } from "@tanstack/react-query";
import { getPresets } from "../presets";

export function usePresetsQuery(userId: string, token: string) {
  return useQuery({
    queryKey: ["presets", userId, token],
    queryFn: () => getPresets({ userId, token }),
    enabled: !!userId && !!token,
    staleTime: 30_000,
  });
}
