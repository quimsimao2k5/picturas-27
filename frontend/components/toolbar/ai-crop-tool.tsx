import { ToolbarButton } from "./toolbar-button";
import { Crop } from "lucide-react";

export default function CropAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "cut_ai",
        params: {},
      }}
      disabled={disabled}
      icon={Crop}
      label="AI Crop"
      isPremium
      noParams
    />
  );
}
