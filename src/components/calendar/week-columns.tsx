import Link from "next/link";
import type { CalendarDay } from "@/lib/calendar/days";
import { calendarHref } from "@/lib/calendar/links";
import { formatDayName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PostCard } from "./post-card";
import { SlotCard } from "./slot-card";

/** The week view: a column per day, stacked on phones. */
export function WeekColumns({ days, now }: { days: CalendarDay[]; now: Date }) {
  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-7 lg:gap-2">
      {days.map((day) => (
        <section
          key={day.date}
          id={day.isToday ? "today" : undefined}
          aria-label={formatDayName(day.date)}
          className="flex min-w-0 flex-col gap-2"
        >
          <Link
            href={calendarHref("day", day.date)}
            className={cn(
              "flex h-11 items-center justify-between rounded-lg border bg-card px-3 text-sm font-semibold hover:bg-muted",
              day.isToday && "border-2 border-primary text-primary-strong",
            )}
          >
            {formatDayName(day.date)}
            {day.isToday ? <span className="text-xs">Today</span> : null}
          </Link>
          {day.items.length === 0 ? (
            <p className="px-1 text-xs text-muted-foreground">
              {day.isPast ? "No posts" : "Nothing planned"}
            </p>
          ) : (
            day.items.map((item) =>
              item.status === "posted" ? (
                <PostCard key={item.key} item={item} size="sm" now={now} />
              ) : (
                <SlotCard key={item.key} item={item} isToday={day.isToday} size="sm" />
              ),
            )
          )}
        </section>
      ))}
    </div>
  );
}
