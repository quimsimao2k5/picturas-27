import { useState } from "react";
import { Expand } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ToolbarButton } from "./toolbar-button";

type ExpandMode = "reflect" | "edge" | "solid" | "generative";

export default function ExpandAITool({ disabled }: { disabled?: boolean }) {
  const [open, setOpen] = useState(false);

  const [percent, setPercent] = useState<number>(25);
  const [mode, setMode] = useState<ExpandMode>("reflect");
  const [color, setColor] = useState<string>("#000000");

  // RF40 (generative)
  const [prompt, setPrompt] = useState<string>("");
  const [negativePrompt, setNegativePrompt] = useState<string>("");
  const [seed, setSeed] = useState<number | "">("");
  const [steps, setSteps] = useState<number | "">(30);
  const [guidance, setGuidance] = useState<number | "">(7);

  return (
    <ToolbarButton
      icon={Expand}
      label="AI Expand"
      disabled={disabled}
      isPremium={true}
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "expand_ai",
        params: {
          percent,
          mode,
          ...(mode === "solid" ? { color } : {}),
          ...(mode === "generative"
            ? {
                // prompt é o mais importante
                prompt: prompt?.trim() || undefined,

                // opcionais (só manda se tiverem valor)
                negativePrompt: negativePrompt?.trim() || undefined,
                seed: seed === "" ? undefined : seed,
                steps: steps === "" ? undefined : steps,
                guidance: guidance === "" ? undefined : guidance,
              }
            : {}),
        },
      }}
    >
      <div className="flex flex-col gap-3 p-2">
        <div className="flex flex-col gap-1">
          <label className="text-sm">Expansão (%)</label>
          <Input
            type="number"
            min={1}
            max={200}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
          />
          <span className="text-xs text-muted-foreground">
            25% costuma ser suficiente para “dar margem” à imagem.
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-sm">Modo</label>
          <select
            className="h-9 rounded-md border bg-background px-3 text-sm"
            value={mode}
            onChange={(e) => setMode(e.target.value as ExpandMode)}
          >
            <option value="reflect">Reflect (recomendado)</option>
            <option value="edge">Edge</option>
            <option value="solid">Solid color</option>
            <option value="generative">Generative (RF40)</option>
          </select>
        </div>

        {mode === "solid" && (
          <div className="flex flex-col gap-1">
            <label className="text-sm">Cor</label>
            <Input
              type="text"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="#000000"
            />
            <span className="text-xs text-muted-foreground">
              Formato: #RRGGBB
            </span>
          </div>
        )}

        {mode === "generative" && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm">Prompt</label>
              <Input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder='Ex: "extend the sky naturally, same lighting and style"'
              />
              <span className="text-xs text-muted-foreground">
                Dica: descreve como queres continuar o conteúdo (céu, relva,
                fundo, etc.), mantendo estilo/iluminação.
              </span>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm">Negative prompt (opcional)</label>
              <Input
                type="text"
                value={negativePrompt}
                onChange={(e) => setNegativePrompt(e.target.value)}
                placeholder='Ex: "text, watermark, blurry, artifacts"'
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm">Seed</label>
                <Input
                  type="number"
                  value={seed}
                  onChange={(e) =>
                    setSeed(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="(auto)"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm">Steps</label>
                <Input
                  type="number"
                  min={1}
                  max={150}
                  value={steps}
                  onChange={(e) =>
                    setSteps(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm">Guidance</label>
                <Input
                  type="number"
                  min={0}
                  max={20}
                  value={guidance}
                  onChange={(e) =>
                    setGuidance(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ToolbarButton>
  );
}
