"use client";

import { CheckIcon, CopyIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CopyButtonProps = {
  text: string;
  label?: string;
  /** `primary`: the main action on a draft. `outline`: everything else. */
  variant?: "primary" | "outline";
  className?: string;
};

/** Copies text to the clipboard and says so for a moment. */
export function CopyButton({
  text,
  label = "Copy",
  variant = "outline",
  className,
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant={variant === "primary" ? "default" : "outline"}
      className={cn("h-9 gap-1.5 pointer-coarse:h-11", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          // No clipboard access: the text is on screen to copy by hand.
        }
      }}
    >
      {copied ? <CheckIcon aria-hidden="true" /> : <CopyIcon aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </Button>
  );
}
