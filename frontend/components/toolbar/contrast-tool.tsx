import { ToolbarButton } from "./toolbar-button";
import { Slider } from "../ui/slider";
import { Contrast } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import { ContrastToolParams } from "@/lib/tool-types";

export default function ContrastTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const defaultValue = 1;
  const [value, setValue] = useState<number>(defaultValue);
  const [open, setOpen] = useState<boolean>(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  useEffect(() => {
    const contrastTool = project.tools.find((t) => t.procedure === "contrast");
    if (contrastTool) {
      setValue((contrastTool.params as ContrastToolParams).contrastFactor);
    }
  }, [project.tools, open]);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "contrast",
        params: {
          contrastFactor: value,
        },
      }}
      onDefault={() => {
        setValue(defaultValue);
        setHasUnsavedChanges(false);
      }}
      isDefault={value === defaultValue}
      disabled={disabled}
      icon={Contrast}
      label="Contrast"
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
