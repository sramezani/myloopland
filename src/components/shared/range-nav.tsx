import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type RangeNavProps = {
  label: string;
  prev: Route;
  next: Route;
  today: Route;
  /** Hide "Today" when the range already shows it. */
  showToday: boolean;
  className?: string;
};

const square =
  "inline-flex size-10 items-center justify-center rounded-lg border bg-card text-foreground transition-colors hover:bg-muted pointer-coarse:size-11";

/** Previous · Today · Next, with the range's name. All links. */
export function RangeNav({ label, prev, next, today, showToday, className }: RangeNavProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <Link href={prev} aria-label="Earlier" className={square}>
        <ChevronLeftIcon className="size-4" aria-hidden="true" />
      </Link>
      <Link href={next} aria-label="Later" className={square}>
        <ChevronRightIcon className="size-4" aria-hidden="true" />
      </Link>
      {showToday ? (
        <Link
          href={today}
          className="inline-flex h-10 items-center rounded-lg border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted pointer-coarse:h-11"
        >
          Today
        </Link>
      ) : null}
      <h2 className="ml-1 text-lg font-semibold">{label}</h2>
    </div>
  );
}
