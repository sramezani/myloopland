/**
 * The one home for formatting numbers, days and times (docs/SPEC.md section 3). Everything
 * on screen goes through here. Trimmed from SimpleDash's src/lib/format.ts.
 */

import { WEEKDAYS as WEEK, type Weekday } from "@/lib/dates";

const LOCALE = "en-GB";

const integer = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

/** 1234 → "1,234". */
export function formatNumber(value: number): string {
  return integer.format(Math.round(value));
}

/** 1234 → "1,234", 123456 → "123K". For tight spaces such as calendar cells. */
export function formatCompact(value: number): string {
  return Math.abs(value) < 10_000 ? formatNumber(value) : compact.format(value);
}

/** A number, or "—" when it isn't known. Never a fake zero. */
export function formatMaybe(value: number | null | undefined): string {
  return value === null || value === undefined ? "—" : formatCompact(value);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parts(isoDate: string) {
  const [y, m, d] = isoDate.split("-").map(Number);
  return { y: y ?? 1970, m: m ?? 1, d: d ?? 1 };
}

function weekday(isoDate: string): string {
  const { y, m, d } = parts(isoDate);
  return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]!;
}

/** "mon" → "Monday": a weekday of the playbook (weeks start on Monday). */
export function formatWeekday(day: Weekday): string {
  return WEEKDAYS[(WEEK.indexOf(day) + 1) % 7]!;
}

/** "2026-10-04" → "4 Oct". Add the year with `withYear`. */
export function formatDay(isoDate: string, withYear = false): string {
  const { y, m, d } = parts(isoDate);
  return `${d} ${MONTHS[m - 1]}${withYear ? ` ${y}` : ""}`;
}

/** "2026-10-30" → "Fri 30 Oct": a day in a label. */
export function formatDayName(isoDate: string): string {
  return `${weekday(isoDate).slice(0, 3)} ${formatDay(isoDate)}`;
}

/** "2026-10-30" → "Friday 30 October": a day in a heading. */
export function formatLongDay(isoDate: string): string {
  const { m, d } = parts(isoDate);
  const long = new Date(Date.UTC(2000, m - 1, 1)).toLocaleString(LOCALE, {
    month: "long",
    timeZone: "UTC",
  });
  return `${weekday(isoDate)} ${d} ${long}`;
}

/** A range of days: "26 Oct – 29 Nov", or with years when they differ. */
export function formatDayRange(start: string, end: string): string {
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDay(start, !sameYear)} – ${formatDay(end, !sameYear)}`;
}

/** "2027-10-30" → "Oct 2027": a goal date in a sentence. */
export function formatMonthYear(isoDate: string): string {
  const { y, m } = parts(isoDate);
  return `${MONTHS[m - 1]} ${y}`;
}

/** A clock time in a time zone: "14:00". */
export function formatTime(date: Date, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date);
}

/** A date for people: 11 Oct 2027. */
export function formatDate(date: Date, timeZone = "UTC"): string {
  return new Intl.DateTimeFormat(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone,
  }).format(date);
}

/** How long ago: "just now", minutes, hours, then the date. */
export function formatAgo(date: Date, now: Date = new Date()): string {
  const minutes = Math.floor((now.getTime() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return `on ${formatDate(date)}`;
}

/** +6 → "+6", -3 → "−3", 0 → "±0": a change in followers. */
export function formatSigned(value: number): string {
  if (value === 0) return "±0";
  return value > 0 ? `+${formatNumber(value)}` : `−${formatNumber(Math.abs(value))}`;
}
