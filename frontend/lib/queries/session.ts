import { useQuery } from "@tanstack/react-query";
import { SessionData } from "../session";
import { useRegister } from "../mutations/session";

export const useGetSession = () => {
  const register = useRegister();
  return useQuery({
    queryKey: ["session"],
    queryFn: () => {
      const session = localStorage.getItem("session");
      if (!session) {
        register.mutate({ type: "anonymous" });
        return null;
      }
      return JSON.parse(session) as SessionData;
    },
  });
};
