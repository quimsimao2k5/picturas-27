import { ToolbarButton } from "./toolbar-button";
import { Frame } from "lucide-react";
import { useEffect, useState } from "react";
import { useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import { BorderToolParams } from "@/lib/tool-types";
import { hexToRgb, isValidHexColor, rgbToHex } from "@/lib/utils";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { HexColorInput, HexColorPicker } from "react-colorful";

export default function BorderTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const defaultWidth = 1;
  const defaultColor = "#000000";
  const [width, setWidth] = useState<number>(defaultWidth);
  const [color, setColor] = useState<string>(defaultColor);
  const [open, setOpen] = useState<boolean>(false);
  const { setHasUnsavedChanges } = useUnsavedChanges();

  function handleColorChange(newColor: string) {
    if (isValidHexColor(newColor)) {
      setColor(newColor);
      setHasUnsavedChanges(true);
    }
  }

  function handleWidthChange(newWidth: number) {
    if (newWidth > 0) {
      setWidth(newWidth);
      setHasUnsavedChanges(true);
    }
  }

  useEffect(() => {
    const borderTool = project.tools.find((t) => t.procedure === "border");
    if (borderTool) {
      const params = borderTool.params as BorderToolParams;
      setWidth(params.borderWidth);
      setColor(rgbToHex(params.r, params.g, params.b));
    }
  }, [project.tools, open]);

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "border",
        params: {
          borderWidth: width,
          r: hexToRgb(color)?.r ?? 0,
          g: hexToRgb(color)?.g ?? 0,
          b: hexToRgb(color)?.b ?? 0,
        },
      }}
      onDefault={() => {
        setWidth(defaultWidth);
        setColor(defaultColor);
        setHasUnsavedChanges(false);
      }}
      isDefault={width === defaultWidth && color === defaultColor}
      disabled={disabled}
      icon={Frame}
      label="Create Border"
    >
      <div className="flex flex-col justify-center items-center gap-4">
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="width">Width</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) => handleWidthChange(Number(e.target.value))}
            />
            <span>px</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center gap-2">
          <HexColorPicker
            color={color}
            onChange={(c) => {
              setColor(c);
              setHasUnsavedChanges(true);
            }}
          />
          <HexColorInput
            color={color}
            onChange={handleColorChange}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
          />
        </div>
      </div>
    </ToolbarButton>
  );
}
