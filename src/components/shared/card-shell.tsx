import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CardShellProps = {
  id: string;
  title: string;
  /** Right side of the header: a badge or a button. */
  actions?: ReactNode;
  /** Title for screen readers only (the content names the card). */
  hideTitle?: boolean;
  className?: string;
  children: ReactNode;
};

/**
 * The shell of every card, so titles, actions and spacing look the same everywhere.
 * It is a size container, so the content adapts to the card's width, not the page's.
 */
export function CardShell({ id, title, actions, hideTitle, className, children }: CardShellProps) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className={cn(
        "@container relative flex min-w-0 flex-col rounded-2xl border bg-card text-card-foreground shadow-xs",
        className,
      )}
    >
      <header
        className={cn(
          "flex min-h-11 items-center justify-between gap-2 px-4 pt-3",
          hideTitle && "absolute top-0 right-0 z-10",
        )}
      >
        <h2
          id={`${id}-title`}
          className={cn("text-sm leading-tight font-semibold", hideTitle && "sr-only")}
        >
          {title}
        </h2>
        {actions ? <div className="flex shrink-0 items-center gap-1">{actions}</div> : null}
      </header>
      <div className={cn("flex flex-1 flex-col px-4 pb-4", hideTitle ? "pt-4" : "pt-2")}>
        {children}
      </div>
    </section>
  );
}
