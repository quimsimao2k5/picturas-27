import { ToolbarButton } from "./toolbar-button";
import { Users } from "lucide-react";

export default function PeopleAITool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "people_ai",
        params: {},
      }}
      disabled={disabled}
      icon={Users}
      label="AI People Detection"
      isPremium
      noParams
    />
  );
}
