import { ExternalLinkIcon } from "lucide-react";
import { Metric } from "@/components/shared/metric";
import { StatusBadge } from "@/components/shared/status-badge";
import type { CalendarItem } from "@/lib/calendar/days";
import { formatAgo, formatMaybe } from "@/lib/format";
import { cn } from "@/lib/utils";

const KIND_WORDS = {
  post: "Post",
  quote: "Quote",
  thread: "Thread",
  community: "Community",
} as const;

/** A post that went out: its text and its newest numbers (a dash for unknown ones). */
export function PostCard({
  item,
  size,
  now,
}: {
  item: CalendarItem;
  size: "sm" | "lg";
  now: Date;
}) {
  const lg = size === "lg";
  const label = [item.time, item.pillar ?? KIND_WORDS[item.kind]].filter(Boolean).join(" · ");
  const m = item.metrics;
  return (
    <article className={cn("flex flex-col gap-3 rounded-xl border bg-past", lg ? "p-4" : "p-3")}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground tabular-nums">{label}</p>
        <StatusBadge status="posted" size={lg ? "md" : "sm"} />
      </div>
      {item.text ? (
        <p
          className={cn(
            "whitespace-pre-line",
            lg ? "text-base leading-relaxed" : "line-clamp-3 text-sm leading-snug",
          )}
        >
          {item.text}
        </p>
      ) : null}
      {lg ? (
        <>
          <dl className="grid grid-cols-3 gap-x-6 gap-y-3 sm:grid-cols-4">
            <Metric label="Views" value={m?.views ?? null} />
            <Metric label="Likes" value={m?.likes ?? null} />
            <Metric label="Replies" value={m?.replies ?? null} />
            <Metric label="Reposts" value={m?.reposts ?? null} />
            <Metric label="Bookmarks" value={m?.bookmarks ?? null} />
            <Metric label="Profile visits" value={m?.profileVisits ?? null} />
            <Metric label="New follows" value={m?.newFollows ?? null} />
          </dl>
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>
              {m
                ? `Numbers read ${formatAgo(new Date(m.capturedAt), now)}`
                : "No numbers yet: Claude reads them in its daily routine."}
            </span>
            {item.xUrl ? (
              <a
                href={item.xUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
              >
                Open on X
                <ExternalLinkIcon className="size-3" aria-hidden="true" />
                <span className="sr-only"> (opens a new tab)</span>
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <p className="text-xs text-muted-foreground tabular-nums">
          <span className="font-semibold text-foreground">{formatMaybe(m?.views ?? null)}</span>{" "}
          views
        </p>
      )}
    </article>
  );
}
