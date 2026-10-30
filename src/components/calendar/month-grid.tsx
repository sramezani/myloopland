import type { CalendarDay } from "@/lib/calendar/days";
import { DayCell } from "./day-cell";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The 30-day view: five weeks on a 7-column grid on wide screens, a list of days on phones and tablets. */
export function MonthGrid({ days }: { days: CalendarDay[] }) {
  return (
    <div className="grid grid-cols-1 gap-2 lg:grid-cols-7">
      {WEEKDAYS.map((name) => (
        <p
          key={name}
          aria-hidden="true"
          className="hidden px-1 text-xs font-semibold text-muted-foreground lg:block"
        >
          {name}
        </p>
      ))}
      {days.map((day, i) => (
        <DayCell key={day.date} day={day} first={i === 0} />
      ))}
    </div>
  );
}
