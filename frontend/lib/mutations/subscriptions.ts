import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  subscribe,
  cancel,
  updateSubscription,
  updateCard,
} from "../subscriptions";
import { SessionData } from "../session";

export const useSubscribe = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: subscribe,
    onSuccess: () => {
      const session = JSON.parse(
        localStorage.getItem("session")!,
      ) as SessionData;
      const updatedSession = {
        user: {
          ...session.user,
          type: "premium",
        },
        token: session.token,
      } as SessionData;
      localStorage.setItem("session", JSON.stringify(updatedSession));
      qc.invalidateQueries({ refetchType: "all", queryKey: ["subscription"] });
    },
  });
};

export const useCancelSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: cancel,
    onSuccess: () => {
      const session = JSON.parse(
        localStorage.getItem("session")!,
      ) as SessionData;
      const updatedSession = {
        user: {
          ...session.user,
          type: "free",
        },
        token: session.token,
      } as SessionData;
      localStorage.setItem("session", JSON.stringify(updatedSession));
      qc.invalidateQueries({ refetchType: "all", queryKey: ["subscription"] });
    },
  });
};

export const useUpdateSubscription = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSubscription,
    onSuccess: () => {
      qc.invalidateQueries({ refetchType: "all", queryKey: ["subscription"] });
    },
  });
};

export const useUpdateCard = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateCard,
    onSuccess: () => {
      qc.invalidateQueries({ refetchType: "all", queryKey: ["subscription"] });
    },
  });
};
