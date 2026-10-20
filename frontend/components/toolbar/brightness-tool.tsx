import { ToolbarButton } from "./toolbar-button";
import { Slider } from "../ui/slider";
import { Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import { BrightnessToolParams } from "@/lib/tool-types";

export default function BrightnessTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const defaultValue = 1;
  const [value, setValue] = useState<number>(defaultValue);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const brightnessTool = project.tools.find(
      (t) => t.procedure === "brightness",
    );
    if (brightnessTool) {
      setValue((brightnessTool.params as BrightnessToolParams).brightness);
    } else {
      setValue(defaultValue);
    }
    // aqui NÃO metas setHasUnsavedChanges(false), senão apagas dirty ao abrir o menu
  }, [project.tools, open]);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "brightness",
        params: {
          brightness: value,
        },
      }}
      onDefault={() => {
        setValue(defaultValue);
        setHasUnsavedChanges(false);
      }}
      isDefault={value === defaultValue}
      disabled={disabled}
      icon={Sun}
      label="Brightness"
    >
      <Slider
        defaultValue={[1]}
        max={2}
        step={0.01}
        value={[value]}
        onValueChange={(v) => {
          setValue(v[0]);
          setHasUnsavedChanges(true);
        }}
        className="w-full"
      />
      <div className="flex w-full justify-between items-center text-xs text-gray-500 pt-1">
        <span>-100%</span>
        <span className="font-semibold">{Math.round(value * 100 - 100)}%</span>
        <span>100%</span>
      </div>
    </ToolbarButton>
  );
}
