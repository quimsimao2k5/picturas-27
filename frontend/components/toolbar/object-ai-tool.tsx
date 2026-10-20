import { ToolbarButton } from "./toolbar-button";
import { Box } from "lucide-react";

export default function ObjectAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "obj_ai",
        params: {},
      }}
      disabled={disabled}
      icon={Box}
      label="AI Object Detection"
      isPremium
      noParams
    />
  );
}
