"use client";

import Loading from "@/components/loading";
import { SessionData } from "@/lib/session";
import { createContext, useContext, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { OctagonAlert } from "lucide-react";
import { useGetSession } from "@/lib/queries/session";
import { useUpdateSession } from "@/lib/mutations/session";
import { getErrorMessage } from "@/lib/error-messages";

interface SessionContextData {
  session: SessionData;
}

const SessionContext = createContext<SessionContextData | undefined>(undefined);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useGetSession();
  const updateSession = useUpdateSession();

  useEffect(() => {
    const session = localStorage.getItem("session");
    if (session) {
      const parsedSession = JSON.parse(session) as SessionData;
      updateSession.mutate({
        userId: parsedSession.user._id,
        token: parsedSession.token,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handler = () => {
      session.refetch();
    };

    window.addEventListener("session-updated", handler);
    return () => window.removeEventListener("session-updated", handler);
  }, [session]);

  if (!session.data)
    return (
      <div className="flex justify-center items-center size-full absolute top-0 left-0">
        <Loading />
        {session.isError && (
          (() => {
            const { title, description } = getErrorMessage(
              "generic",
              session.error,
            );

            return (
              <Alert
                variant="destructive"
                className="w-fit max-w-[40rem] text-wrap truncate"
              >
                <OctagonAlert className="size-4" />
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription>{description}</AlertDescription>
              </Alert>
            );
          })()
        )}
      </div>
    );

  return (
    <SessionContext.Provider value={{ session: session.data }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const context = useContext(SessionContext);
  if (context === undefined) {
    throw new Error("useSession() must be used within a SessionProvider");
  }
  return context.session;
}
