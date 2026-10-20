import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createPreset, deletePreset, sharePreset, updatePreset } from "../presets";

export function useCreatePreset(userId: string, token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { name: string; tools: any[] }) =>
      createPreset({ userId, token, name: args.name, tools: args.tools }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presets", userId, token], refetchType: "all" });
    },
  });
}

export function useUpdatePreset(userId: string, token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { presetId: string; patch: any }) =>
      updatePreset({ userId, token, presetId: args.presetId, patch: args.patch }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presets", userId, token], refetchType: "all" });
    },
  });
}

export function useDeletePreset(userId: string, token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { presetId: string }) => deletePreset({ userId, token, presetId: args.presetId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presets", userId, token], refetchType: "all" });
    },
  });
}

export function useSharePreset(userId: string, token: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: { presetId: string }) => sharePreset({ userId, token, presetId: args.presetId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["presets", userId, token], refetchType: "all" });
    },
  });
}
