import type { SVGProps } from "react";
import { brand } from "@/config/theme";
import { cn } from "@/lib/utils";

/** The loop mark: a ring with a dot travelling on it. Also the favicon (src/app/icon.svg). */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" {...props}>
      <circle cx="16" cy="16" r="10" fill="none" stroke="currentColor" strokeWidth="4" />
      <circle cx="26" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

/** The myloopland logo: the loop mark and the name, always one lower-case word. */
export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-base font-semibold tracking-tight text-foreground",
        className,
      )}
    >
      <LogoMark className="size-6 text-brand" />
      {brand.name}
    </span>
  );
}
