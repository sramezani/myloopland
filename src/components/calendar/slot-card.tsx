import { StatusBadge } from "@/components/shared/status-badge";
import type { CalendarItem } from "@/lib/calendar/days";
import { cn } from "@/lib/utils";
import { DraftOption } from "./draft-option";

type SlotCardProps = {
  item: CalendarItem;
  isToday: boolean;
  /** `sm`: a week column. `lg`: the day view. */
  size: "sm" | "lg";
};

/** A planned slot: its time, topic and status, Claude's question, and the drafts with Copy. */
export function SlotCard({ item, isToday, size }: SlotCardProps) {
  const lg = size === "lg";
  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border bg-card", lg ? "p-4" : "p-3")}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-xs text-muted-foreground tabular-nums">{item.time}</p>
          <h3
            className={cn("font-semibold text-balance", lg ? "text-base" : "text-sm leading-snug")}
          >
            {item.topic ?? "Open slot"}
          </h3>
          {item.pillar || item.series ? (
            <p className="text-xs text-muted-foreground">
              {[item.pillar, item.series].filter(Boolean).join(" · ")}
            </p>
          ) : null}
        </div>
        <StatusBadge status={item.status} size={lg ? "md" : "sm"} />
      </div>
      {item.status === "needs_input" && item.question ? (
        <p className="text-sm text-pretty">
          <span className="font-medium">Answer in Claude:</span> {item.question}
        </p>
      ) : null}
      {item.drafts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {item.drafts.map((draft) => (
            <DraftOption key={draft.id} draft={draft} size={size} />
          ))}
        </div>
      ) : item.status === "planned" ? (
        <p className="text-xs text-pretty text-muted-foreground">
          {isToday
            ? "No drafts yet. In Claude: “Run my myloopland morning routine”."
            : "Drafts show up here on the day."}
        </p>
      ) : null}
    </article>
  );
}
