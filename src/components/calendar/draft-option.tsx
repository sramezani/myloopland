import { ExternalLinkIcon } from "lucide-react";
import { CopyButton } from "@/components/shared/copy-button";
import { buttonVariants } from "@/components/ui/button";
import type { DraftView } from "@/lib/calendar/days";
import { cn } from "@/lib/utils";
import { xComposeUrl } from "@/lib/x/x";

/** One of Claude's drafts, ready to copy or to open in X's compose screen. */
export function DraftOption({ draft, size }: { draft: DraftView; size: "sm" | "lg" }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-lg border p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        Option {draft.position}
        {draft.picked ? " · posted" : ""}
      </p>
      <p
        className={cn(
          "whitespace-pre-line",
          size === "lg" ? "text-base leading-relaxed" : "text-sm leading-snug",
        )}
      >
        {draft.text}
      </p>
      {draft.reason ? <p className="text-xs text-muted-foreground">Why: {draft.reason}</p> : null}
      <div className="flex flex-wrap gap-2">
        <CopyButton text={draft.text} variant={size === "lg" ? "primary" : "outline"} />
        <a
          href={xComposeUrl(draft.text)}
          target="_blank"
          rel="noreferrer"
          className={cn(buttonVariants({ variant: "outline" }), "h-9 gap-1.5 pointer-coarse:h-11")}
        >
          <ExternalLinkIcon aria-hidden="true" />
          Open in X<span className="sr-only"> (opens a new tab)</span>
        </a>
      </div>
    </div>
  );
}
