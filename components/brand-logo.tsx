import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className, priority = false }: { className?: string; priority?: boolean }) {
  return (
    <span className={cn("relative block overflow-hidden rounded-full bg-white", className)}>
      <Image
        src="/aeromedico-brasil-logo.jpg"
        alt="Logo oficial Aeromédico Brasil"
        fill
        priority={priority}
        sizes="(max-width: 768px) 220px, 520px"
        className="object-cover"
      />
    </span>
  );
}
