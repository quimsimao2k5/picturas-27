"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ProjectToolResponse } from "@/lib/projects";
import type { Suggestion } from "./ai-assistant-dialog"; // ajusta o path se necessário

type Props = {
  suggestion: Suggestion;
  onChange: (next: Suggestion) => void;
  onApply: (s: Suggestion) => void;
};

export function AiSuggestionEditor({ suggestion, onChange, onApply }: Props) {
  return (
    <div className="space-y-4">
      {suggestion.tools.map((tool: ProjectToolResponse, i: number) => (
        <div key={i} className="border p-2 rounded">
          <strong>{tool.procedure}</strong>

        {Object.entries((tool.params ?? {}) as Record<string, unknown>).map(([k, v]) => (
            <div key={k} className="mt-1">
              <label className="text-xs">{k}</label>
              <Input
                type="number"
                step="any"
                inputMode="decimal"
                value={String(v ?? "")}
                onChange={(e) => {
                  const copy = structuredClone(suggestion) as Suggestion;

                  const params = (copy.tools[i].params ?? {}) as Record<string, unknown>;
                  const original = params[k];

                  let next: any = e.target.value;

                  if (typeof original === "number") {
                    const n = Number(next.replace(",", ".")); // extra safety PT locale
                    next = Number.isFinite(n) ? n : original;
                  } else if (typeof original === "boolean") {
                    next = next === "true";
                  }

                  params[k] = next;
                  copy.tools[i].params = params as any;
                  onChange(copy);
                }}
              />
            </div>
          ))}
        </div>
      ))}

    <Button type="button" onClick={() => onApply(suggestion)}>
    Aplicar sugestão editada
    </Button>

    </div>
  );
}
