import { ToolbarButton } from "./toolbar-button";
import { Signature } from "lucide-react";

export default function WatermarkTool({ disabled }: { disabled: boolean }) {
  return (
    <ToolbarButton
      tool={{
        procedure: "watermark",
        params: {},
      }}
      disabled={disabled}
      icon={Signature}
      label="Watermark"
      noParams
    />
  );
}
