import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center">
      <p className="font-heading text-base font-semibold text-navy-950">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-gray-600">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
