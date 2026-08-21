import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
export function Badge({ className, ...props }: HTMLAttributes<HTMLSpanElement>) { return <span className={cn("inline-flex items-center rounded-full border border-[#38c5ea]/25 bg-[#38c5ea]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[.16em] text-[#8fe9ff]", className)} {...props} />; }
