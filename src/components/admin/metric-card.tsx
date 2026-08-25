export function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-5">
      <p className="text-sm text-gray-600">{label}</p>
      <p className="mt-2 font-heading text-2xl font-bold text-navy-950">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-gray-600">{hint}</p>}
    </div>
  );
}
