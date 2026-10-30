import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** The look of each slot status (docs/SPEC.md section 8). Colour always comes with a word. */
export const statusVariants = cva(
  "inline-flex max-w-full items-center truncate rounded-full font-semibold whitespace-nowrap",
  {
    variants: {
      status: {
        planned: "bg-secondary text-muted-foreground",
        needs_input: "border border-primary bg-card text-primary-strong",
        drafted: "bg-suggested text-suggested-foreground",
        posted: "bg-foreground text-card",
        skipped: "bg-muted text-muted-foreground line-through",
      },
      size: {
        sm: "h-5 px-2 text-xs",
        md: "h-6 px-2.5 text-xs",
      },
    },
    defaultVariants: { size: "md" },
  },
);

export type SlotStatus = NonNullable<VariantProps<typeof statusVariants>["status"]>;

export const STATUS_WORDS: Record<SlotStatus, string> = {
  planned: "Planned",
  needs_input: "Waiting for your take",
  drafted: "Suggested",
  posted: "Posted",
  skipped: "Skipped",
};

type StatusBadgeProps = {
  status: SlotStatus;
  size?: "sm" | "md";
  children?: string;
  /** The full text, shown on hover, when a chip is cut short. */
  title?: string;
  className?: string;
};

/** A status chip; with `children` it shows that text (a topic) in the status colour. */
export function StatusBadge({ status, size, children, title, className }: StatusBadgeProps) {
  return (
    <span title={title} className={cn(statusVariants({ status, size }), className)}>
      {children ?? STATUS_WORDS[status]}
    </span>
  );
}
