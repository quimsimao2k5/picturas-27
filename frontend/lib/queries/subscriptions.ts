import { useQuery } from "@tanstack/react-query";
import { getSubscription, getCard } from "../subscriptions";

export const useGetSubscription = (uid: string) => {
  return useQuery({
    queryKey: ["subscription", uid],
    queryFn: () => getSubscription(uid),
  });
};

export const useGetCard = (uid: string) => {
  return useQuery({
    queryKey: ["card", uid],
    queryFn: () => getCard(uid),
  });
};
