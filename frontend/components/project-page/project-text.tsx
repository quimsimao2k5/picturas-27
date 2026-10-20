import { Card } from "../ui/card";

export default function ProjectText({ text }: { text: string }) {
  return (
    <Card className="size-full overflow-hidden p-4 select-none">
      <div className="size-full overflow-y-scroll overflow-x-hidden flex justify-start">
        <span className="text-sm font-medium text-start">{text}</span>
      </div>
    </Card>
  );
}
