import { ToolbarButton } from "./toolbar-button";
import { Crop } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { useCurrentImage, useProjectInfo } from "@/providers/project-provider";
import { getImageDimensions } from "@/lib/utils";
import { CropToolParams } from "@/lib/tool-types";
import { useUnsavedChanges } from "@/providers/project-provider";

export default function CropTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const defaultValue = 0;
  const [left, setLeft] = useState<number>(defaultValue);
  const [top, setTop] = useState<number>(defaultValue);
  const [right, setRight] = useState<number>(defaultValue);
  const [bottom, setBottom] = useState<number>(defaultValue);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);

  const currentImage = useCurrentImage();

  useEffect(() => {
    const fetchImageDimensions = async () => {
      if (currentImage) {
        const { width, height } = await getImageDimensions(currentImage.url);
        setWidth(width);
        setHeight(height);
      }
    };
    fetchImageDimensions();
  }, [currentImage]);

  useEffect(() => {
    if (project.tools) {
      const cropTool = project.tools.find((t) => t.procedure === "cut");
      if (cropTool) {
        setLeft((cropTool.params as CropToolParams).left);
        setTop((cropTool.params as CropToolParams).top);
        setRight((cropTool.params as CropToolParams).right);
        setBottom((cropTool.params as CropToolParams).bottom);
      }
    }
  }, [project.tools, open]);

  function handleSet({ l, t, r, b }: { l?: number; t?: number; r?: number; b?: number }) {
    if (typeof l === "number" && l + right <= width && l >= 0) setLeft(l);
    if (typeof t === "number" && t + bottom <= height && t >= 0) setTop(t);
    if (typeof r === "number" && r + left <= width && r >= 0) setRight(r);
    if (typeof b === "number" && b + top <= height && b >= 0) setBottom(b);
  }

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "cut",
        params: {
          left: left,
          top: top,
          right: right,
          bottom: bottom,
        },
      }}
      onDefault={() => {
        setLeft(defaultValue);
        setTop(defaultValue);
        setRight(defaultValue);
        setBottom(defaultValue);
        setHasUnsavedChanges(false);
      }}
      isDefault={
        left === defaultValue &&
        top === defaultValue &&
        right === defaultValue &&
        bottom === defaultValue
      }
      disabled={disabled}
      icon={Crop}
      label="Crop"
    >
      <div className="space-y-1">
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="left">Left</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input
              id="left"
              type="number"
              value={left}
              onChange={(e) => {
                handleSet({ l: Number(e.target.value) });
                setHasUnsavedChanges(true);
              }}
            />
            <span>px</span>
          </div>
        </div>
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="top">Top</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input
              id="top"
              type="number"
              value={top}
              onChange={(e) => {
                handleSet({ t: Number(e.target.value) });
                setHasUnsavedChanges(true);
              }}
            />
            <span>px</span>
          </div>
        </div>
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="right">Right</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input
              id="right"
              type="number"
              value={right}
              onChange={(e) => {
                handleSet({ r: Number(e.target.value) });
                setHasUnsavedChanges(true);
              }}
            />
            <span>px</span>
          </div>
        </div>
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="bottom">Bottom</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input
              id="bottom"
              type="number"
              value={bottom}
              onChange={(e) => {
                handleSet({ b: Number(e.target.value) });
                setHasUnsavedChanges(true);
              }}
            />
            <span>px</span>
          </div>
        </div>
      </div>
    </ToolbarButton>
  );
}
