"use client";

import { useSession } from "@/providers/session-provider";

export default function OperationsCounter() {
  const session = useSession();
  const user = session.user;

  // Só interessa para free/anonymous
  if (user.type === "premium") return null;

  const remaining = user.remaining_operations;

  console.log("SESSION USER:", user);
  console.log("remaining:", remaining);
  // Se ainda não tivermos o valor (primeiros ms), não mostra nada
  if (remaining === undefined || remaining === null) return null;
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span>Operações diárias restantes</span>
      <span className="text-sm font-semibold text-foreground">
        {remaining}
      </span>
    </div>
  );
}
