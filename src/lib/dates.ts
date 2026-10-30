/**
 * Calendar days as ISO strings (YYYY-MM-DD) and clock times as "HH:MM", in the user's own
 * time zone. Day arithmetic uses UTC midnights, so it never shifts with daylight saving.
 * Trimmed from SimpleDash's src/lib/ga4/ranges.ts.
 */

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

function toUtc(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function fromUtc(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** A real calendar day as YYYY-MM-DD ("2026-02-30" and "2026-13-40" are not). */
export function isIsoDay(value: string): boolean {
  if (!ISO_DAY.test(value)) return false;
  const date = toUtc(value);
  return !Number.isNaN(date.getTime()) && fromUtc(date) === value;
}

/** A 24-hour clock time, "00:00" to "23:59". */
export function isClockTime(value: string): boolean {
  return HH_MM.test(value);
}

/** An IANA time zone this runtime knows, eg "Europe/Amsterdam". */
export function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

export function addDays(isoDate: string, days: number): string {
  const d = toUtc(isoDate);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtc(d);
}

/** Whole days from `a` to `b` (negative when `b` is earlier). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86_400_000);
}

/** "mon" … "sun" for a day. */
export function weekdayOf(isoDate: string): Weekday {
  const sundayFirst = toUtc(isoDate).getUTCDay();
  return WEEKDAYS[(sundayFirst + 6) % 7]!;
}

/** The Monday on or before a day (weeks start on Monday). */
export function mondayOf(isoDate: string): string {
  return addDays(isoDate, -WEEKDAYS.indexOf(weekdayOf(isoDate)));
}

/** Every day from `from` to `to`, both included. */
export function eachDay(from: string, to: string): string[] {
  const days: string[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/** The calendar day and clock time of an instant in a time zone. */
export function localParts(instant: Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

/** Today's calendar day in a time zone, as YYYY-MM-DD. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return localParts(now, timeZone).date;
}
