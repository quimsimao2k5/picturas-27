import { ToolbarButton } from "./toolbar-button";
import { Slider } from "../ui/slider";
import { Binary } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import { BinarizationToolParams } from "@/lib/tool-types";

export default function BinarizationTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const defaultValue = 0;
  const [value, setValue] = useState<number>(defaultValue);
  const [open, setOpen] = useState<boolean>(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  useEffect(() => {
    const binarizationTool = project.tools.find(
      (t) => t.procedure === "binarization",
    );
    if (binarizationTool) {
      setValue((binarizationTool.params as BinarizationToolParams).threshold);
    }
  }, [project.tools, open]);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "binarization",
        params: {
          threshold: value,
        },
      }}
      onDefault={() => {
        setValue(defaultValue);
        setHasUnsavedChanges(false);
      }}      
      isDefault={value === defaultValue}
      disabled={disabled}
      icon={Binary}
      label="Black & White"
    >
      <Slider
        defaultValue={[0]}
        max={255}
        step={1}
        value={[value]}
        onValueChange={(v) => {
          setValue(v[0]);
          setHasUnsavedChanges(true);
        }}
        className="w-full"
      />
      <div className="flex w-full justify-between items-center text-xs text-gray-500 pt-1">
        <span>0</span>
        <span className="font-semibold">{value}</span>
        <span>255</span>
      </div>
    </ToolbarButton>
  );
}
