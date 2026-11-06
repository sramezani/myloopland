import type { Route } from "next";
import Link from "next/link";
import { cn } from "@/lib/utils";

type SegmentedLinksProps = {
  label: string;
  options: { href: Route; label: string; current: boolean }[];
  className?: string;
};

/**
 * A segmented control made of links (the calendar's Day · Week · 30 days): the page itself
 * holds the state, so it works without JavaScript and every view has its own address.
 */
export function SegmentedLinks({ label, options, className }: SegmentedLinksProps) {
  return (
    <nav aria-label={label} className={cn(segmentedGroup, className)}>
      {options.map((option) => (
        <Link
          key={option.href}
          href={option.href}
          aria-current={option.current ? "page" : undefined}
          className={segmentedItem(option.current)}
        >
          {option.label}
        </Link>
      ))}
    </nav>
  );
}

/** The look of a segmented control, for the same control made of buttons (a list filter). */
export const segmentedGroup = "inline-flex gap-1 rounded-xl bg-muted p-1";

export function segmentedItem(current: boolean, className?: string) {
  return cn(
    "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-4 text-sm font-semibold whitespace-nowrap transition-colors pointer-coarse:h-11",
    current
      ? "bg-foreground text-card"
      : "text-muted-foreground hover:bg-card hover:text-foreground",
    className,
  );
}
