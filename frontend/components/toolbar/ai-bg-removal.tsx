import { ToolbarButton } from "./toolbar-button";
import { ImageOff } from "lucide-react";

export default function BgRemovalAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "bg_remove_ai",
        params: {},
      }}
      disabled={disabled}
      icon={ImageOff}
      label="AI Background Removal"
      isPremium
      noParams
    />
  );
}
