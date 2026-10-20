import { Loader } from "lucide-react";
import { HTMLAttributes } from "react";

export default function Loading({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`inline-flex items-center ${className}`} {...props}>
      <Loader className="animate-spin size-[1em]" />
      <span className="pl-2">Loading...</span>
    </div>
  );
}
