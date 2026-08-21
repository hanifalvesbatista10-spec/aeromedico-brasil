import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
const buttonVariants = cva("focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { primary: "bg-[#ff7a1a] text-white shadow-[0_12px_30px_rgba(255,122,26,.28)] hover:bg-[#f06b0b]", secondary: "border border-white/20 bg-white/10 text-white hover:bg-white/15", dark: "bg-[#07182b] text-white hover:bg-[#0b2540]", outline: "border border-slate-300 bg-white text-[#07182b] hover:border-[#1175d1] hover:text-[#1175d1]", ghost: "text-slate-600 hover:bg-slate-100 hover:text-[#07182b]" }, size: { sm: "h-9 px-4 text-sm", md: "h-12 px-6 text-sm", lg: "h-14 px-7 text-base" } }, defaultVariants: { variant: "primary", size: "md" } });
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
export { buttonVariants };
