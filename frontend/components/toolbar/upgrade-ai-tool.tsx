import { ToolbarButton } from "./toolbar-button";
import { ArrowBigUpDashIcon } from "lucide-react";

export default function UpgradeAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "upgrade_ai",
        params: {},
      }}
      disabled={disabled}
      icon={ArrowBigUpDashIcon}
      label="AI Upgrade"
      isPremium
      noParams
    />
  );
}
