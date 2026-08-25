import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({
  size = 36,
  showWordmark = true,
  wordmarkClassName,
  className,
}: {
  size?: number;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/brand/logo.jpg"
        alt="Aeromédico Brasil"
        width={size}
        height={size}
        className="rounded-full"
        priority
      />
      {showWordmark && (
        <span
          className={cn(
            "font-heading text-lg font-bold tracking-tight text-navy-950",
            wordmarkClassName
          )}
        >
          Aeromédico Brasil
        </span>
      )}
    </span>
  );
}
