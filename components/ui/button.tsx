import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
const buttonVariants = cva("focus-ring inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { primary: "bg-[#c9060a] text-white shadow-[0_12px_30px_rgba(201,6,10,.28)] hover:bg-[#aa070b]", secondary: "border border-white/20 bg-white/10 text-white hover:bg-white/15", dark: "bg-[#071b2c] text-white hover:bg-[#0c2b45]", outline: "border border-slate-300 bg-white text-[#071b2c] hover:border-[#c9060a] hover:text-[#c9060a]", ghost: "text-slate-600 hover:bg-slate-100 hover:text-[#071b2c]" }, size: { sm: "h-9 px-4 text-sm", md: "h-12 px-6 text-sm", lg: "h-14 px-7 text-base" } }, defaultVariants: { variant: "primary", size: "md" } });
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
export { buttonVariants };
