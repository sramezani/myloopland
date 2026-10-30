import { formatMaybe } from "@/lib/format";
import { cn } from "@/lib/utils";

/** A labelled number. An unknown number shows a dash, never a zero. */
export function Metric({
  label,
  value,
  className,
}: {
  label: string;
  value: number | null;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">
        {formatMaybe(value)}
        {value === null ? <span className="sr-only"> (not known yet)</span> : null}
      </dd>
    </div>
  );
}
