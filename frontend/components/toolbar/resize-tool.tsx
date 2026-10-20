import { ToolbarButton } from "./toolbar-button";
import { Scaling } from "lucide-react";
import { useEffect, useState } from "react";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { getImageDimensions } from "@/lib/utils";
import { useCurrentImage, useProjectInfo, useUnsavedChanges } from "@/providers/project-provider";
import { ResizeToolParams } from "@/lib/tool-types";

export default function ResizeTool({ disabled }: { disabled: boolean }) {
  const project = useProjectInfo();
  const currentImage = useCurrentImage();
  const { setHasUnsavedChanges } = useUnsavedChanges();

  const [defaultWidth, setDefaultWidth] = useState<number>(0);
  const [defaultHeight, setDefaultHeight] = useState<number>(0);
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [open, setOpen] = useState<boolean>(false);

  useEffect(() => {
    const fetchImageDimensions = async () => {
      if (currentImage) {
        const { width, height } = await getImageDimensions(currentImage.url);
        setDefaultWidth(width);
        setDefaultHeight(height);
      }
    };
    fetchImageDimensions();
  }, [currentImage]);

  useEffect(() => {
    const fetchToolDimensions = async () => {
      if (project.tools) {
        const resizeTool = project.tools.find((t) => t.procedure === "resize");
        if (resizeTool) {
          setWidth((resizeTool.params as ResizeToolParams).width);
          setHeight((resizeTool.params as ResizeToolParams).height);
        } else {
          setWidth(defaultWidth);
          setHeight(defaultHeight);
        }
      }
    };
    fetchToolDimensions();
  }, [project.tools, defaultHeight, defaultWidth]);

  function handleSet({ w, h }: { w?: number; h?: number }) {
    if (typeof w === "number" && w >= 0) setWidth(w);
    if (typeof h === "number" && h >= 0) setHeight(h);
  }

  return (
    <ToolbarButton
      open={open}
      setOpen={setOpen}
      tool={{
        procedure: "resize",
        params: {
          width,
          height,
        },
      }}
      onDefault={() => {
        setWidth(defaultWidth);
        setHeight(defaultHeight);
        setHasUnsavedChanges(false);
      }}
      isDefault={width === defaultWidth && height === defaultHeight}
      disabled={disabled}
      icon={Scaling}
      label="Resize"
    >
      <div className="space-y-1">
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="width">Width</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input
              id="width"
              type="number"
              value={width}
              onChange={(e) => {
                handleSet({ w: Number(e.target.value) });
                setHasUnsavedChanges(true);
              }}
              />
            <span>px</span>
          </div>
        </div>
        <div className="flex w-full justify-between items-center text-sm text-gray-500">
          <Label htmlFor="height">Height</Label>
          <div className="flex items-center space-x-2 w-1/2">
            <Input
              id="height"
              type="number"
              value={height}
              onChange={(e) => {
                handleSet({ h: Number(e.target.value) });
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
