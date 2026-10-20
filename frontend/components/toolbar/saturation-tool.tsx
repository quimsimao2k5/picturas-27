import { ToolbarButton } from "./toolbar-button";
import { Slider } from "../ui/slider";
import { Droplet } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import { SaturationToolParams } from "@/lib/tool-types";

export default function SaturationTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const defaultValue = 1;
  const [value, setValue] = useState<number>(defaultValue);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const saturationTool = project.tools.find(
      (t) => t.procedure === "saturation",
    );
    if (saturationTool) {
      setValue(
        (saturationTool.params as SaturationToolParams).saturationFactor,
      );
    }
  }, [project.tools, open]);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "saturation",
        params: {
          saturationFactor: value,
        },
      }}
      onDefault={() => {
        setValue(defaultValue);
        setHasUnsavedChanges(false);
      }}
      isDefault={value === defaultValue}
      disabled={disabled}
      icon={Droplet}
      label="Saturation"
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
