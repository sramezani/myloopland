import type { Route } from "next";
import type { CalendarView } from "./range";

/** The dashboard's address for a view and day. Today's day box has the id "today". */
export function calendarHref(view: CalendarView, date?: string, hash?: "today"): Route {
  const query = new URLSearchParams({ view });
  if (date) query.set("date", date);
  return `/dashboard?${query.toString()}${hash ? `#${hash}` : ""}` as Route;
}
