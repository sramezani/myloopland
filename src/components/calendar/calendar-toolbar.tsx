import { RangeNav } from "@/components/shared/range-nav";
import { SegmentedLinks } from "@/components/shared/segmented-links";
import { calendarHref } from "@/lib/calendar/links";
import type { CalendarRange } from "@/lib/calendar/range";

const VIEWS = [
  { view: "day", label: "Day" },
  { view: "week", label: "Week" },
  { view: "month", label: "30 days" },
] as const;

/** Day · Week · 30 days, and earlier / today / later. Links only: the page holds the state. */
export function CalendarToolbar({ range, today }: { range: CalendarRange; today: string }) {
  const showsToday = range.from <= today && today <= range.to;
  return (
    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
      <RangeNav
        label={range.label}
        prev={calendarHref(range.view, range.prev)}
        next={calendarHref(range.view, range.next)}
        today={calendarHref(range.view, undefined, "today")}
        showToday={!showsToday}
      />
      <SegmentedLinks
        label="Calendar view"
        options={VIEWS.map(({ view, label }) => ({
          href: calendarHref(view, range.anchor),
          label,
          current: range.view === view,
        }))}
      />
    </div>
  );
}
