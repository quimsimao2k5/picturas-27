import { ToolbarButton } from "./toolbar-button";
import { Slider } from "../ui/slider";
import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import { RotateToolParams } from "@/lib/tool-types";

export default function RotateTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const { setHasUnsavedChanges } = useUnsavedChanges();
  const defaultValue = 0;
  const [value, setValue] = useState<number>(defaultValue);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const rotateTool = project.tools.find((t) => t.procedure === "rotate");
    if (rotateTool) {
      setValue((rotateTool.params as RotateToolParams).degrees);
    }
  }, [project.tools, open]);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "rotate",
        params: {
          degrees: value,
        },
      }}
      onDefault={() => {
        setValue(defaultValue);
        setHasUnsavedChanges(false);
      }}
      isDefault={value === defaultValue}
      disabled={disabled}
      icon={RotateCcw}
      label="Rotate"
    >
      <Slider
        defaultValue={[0]}
        max={360}
        step={1}
        value={[value]}
        onValueChange={(v) => {
          setValue(v[0]);
          setHasUnsavedChanges(true);
        }}
        className="w-full"
      />
      <div className="flex w-full justify-between items-center text-xs text-gray-500 pt-1">
        <span>0º</span>
        <span className="font-semibold">{value}º</span>
        <span>360º</span>
      </div>
    </ToolbarButton>
  );
}
