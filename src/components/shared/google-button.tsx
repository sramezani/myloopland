import Image from "next/image";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** A button with Google's "G", for starting Google sign-in. */
export function GoogleButton({ className, children, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex h-11 items-center justify-center gap-3 rounded-lg border border-input bg-card px-5 text-sm font-medium text-foreground shadow-xs transition-colors duration-150 ease-out hover:bg-muted active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <Image src="/google-g.svg" alt="" width={18} height={18} />
      {children}
    </button>
  );
}
