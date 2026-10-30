import Link from "next/link";
import { StatusBadge } from "@/components/shared/status-badge";
import type { CalendarDay } from "@/lib/calendar/days";
import { calendarHref } from "@/lib/calendar/links";
import { formatDay, formatDayName, formatMaybe } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One day of the 30-day view: what was posted (past days) or the slots planned (today and
 * later). Below 1024px the grid becomes a list, so the cell names its weekday too.
 */
export function DayCell({ day, first }: { day: CalendarDay; first: boolean }) {
  const dayNumber = Number(day.date.slice(8));
  const short = first || dayNumber === 1 ? formatDay(day.date) : String(dayNumber);
  return (
    <div
      id={day.isToday ? "today" : undefined}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-xl p-2 lg:min-h-32",
        day.isToday && "border-2 border-primary bg-card",
        !day.isToday && day.isPast && "border bg-past",
        !day.isToday && !day.isPast && "border bg-card",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <Link
          href={calendarHref("day", day.date)}
          aria-label={`Open ${formatDayName(day.date)}`}
          className="-mt-1 -ml-1 inline-flex min-h-8 items-center rounded-md px-1.5 text-sm font-semibold tabular-nums hover:bg-muted pointer-coarse:min-h-11"
        >
          <span className="lg:hidden">{formatDayName(day.date)}</span>
          <span className="hidden lg:inline">{short}</span>
        </Link>
        {day.isToday ? <span className="text-xs font-bold text-primary-strong">Today</span> : null}
      </div>
      {day.isPast ? (
        day.items.length > 0 ? (
          day.items.map((item) => (
            <p key={item.key} className="flex justify-between gap-1.5 text-xs tabular-nums">
              <span className="truncate text-muted-foreground">{item.pillar ?? item.kind}</span>
              <span className="shrink-0 font-semibold">
                {formatMaybe(item.metrics?.views ?? null)} views
              </span>
            </p>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No posts</p>
        )
      ) : (
        day.items.map((item) => (
          <StatusBadge
            key={item.key}
            status={item.status}
            size="sm"
            className="block"
            title={item.topic ?? undefined}
          >
            {item.status === "posted"
              ? `Posted · ${formatMaybe(item.metrics?.views ?? null)} views`
              : (item.topic ?? "Open slot")}
          </StatusBadge>
        ))
      )}
    </div>
  );
}
