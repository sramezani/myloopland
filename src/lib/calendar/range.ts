import { addDays, isIsoDay, mondayOf } from "@/lib/dates";
import { formatDayRange, formatLongDay } from "@/lib/format";

export const CALENDAR_VIEWS = ["day", "week", "month"] as const;
export type CalendarView = (typeof CALENDAR_VIEWS)[number];

export type CalendarRange = {
  view: CalendarView;
  anchor: string;
  from: string;
  to: string;
  /** The anchors one step back and forward. */
  prev: string;
  next: string;
  label: string;
};

/**
 * The days a view shows around an anchor day (docs/SPEC.md section 6):
 * - day: the day itself;
 * - week: Monday to Sunday;
 * - month ("30 days"): 5 weeks from the Monday of the week before, so about 10 past days and
 *   24 coming days around today. Previous and next move 4 weeks.
 */
export function rangeFor(view: CalendarView, anchor: string): CalendarRange {
  if (view === "day") {
    return {
      view,
      anchor,
      from: anchor,
      to: anchor,
      prev: addDays(anchor, -1),
      next: addDays(anchor, 1),
      label: formatLongDay(anchor),
    };
  }
  if (view === "week") {
    const from = mondayOf(anchor);
    const to = addDays(from, 6);
    const step = 7;
    return {
      view,
      anchor,
      from,
      to,
      prev: addDays(anchor, -step),
      next: addDays(anchor, step),
      label: formatDayRange(from, to),
    };
  }
  const from = addDays(mondayOf(anchor), -7);
  const to = addDays(from, 34);
  const step = 28;
  return {
    view,
    anchor,
    from,
    to,
    prev: addDays(anchor, -step),
    next: addDays(anchor, step),
    label: formatDayRange(from, to),
  };
}

/** Reads `?view=` safely; anything else is the 30-day view. */
export function parseView(value: unknown): CalendarView {
  const v = Array.isArray(value) ? value[0] : value;
  return (CALENDAR_VIEWS as readonly unknown[]).includes(v) ? (v as CalendarView) : "month";
}

/** Reads `?date=` safely; anything else is today. */
export function parseAnchor(value: unknown, today: string): string {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && isIsoDay(v) ? v : today;
}
