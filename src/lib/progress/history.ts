import { addDays, localParts } from "@/lib/dates";

/** One point a day on the followers chart: a local day and the count Claude read on it. */
export type FollowerDay = { date: string; followers: number };

/**
 * The last follower count of each local day, oldest first. Claude can read the count more
 * than once a day (setup, the daily run, a chat), so the chart keeps the newest one.
 */
export function dailyFollowers(
  readings: { capturedAt: Date; followers: number }[],
  timeZone: string,
): FollowerDay[] {
  const byDay = new Map<string, { at: number; followers: number }>();
  for (const reading of readings) {
    const { date } = localParts(reading.capturedAt, timeZone);
    const at = reading.capturedAt.getTime();
    const seen = byDay.get(date);
    if (!seen || at > seen.at) byDay.set(date, { at, followers: reading.followers });
  }
  return [...byDay]
    .map(([date, { followers }]) => ({ date, followers }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Splits the days into runs of back-to-back dates: a day without a reading is a gap, never a guess. */
export function consecutiveRuns(days: FollowerDay[]): FollowerDay[][] {
  const runs: FollowerDay[][] = [];
  for (const day of days) {
    const run = runs.at(-1);
    if (run && addDays(run.at(-1)!.date, 1) === day.date) run.push(day);
    else runs.push([day]);
  }
  return runs;
}

/** Round whole-number axis values from just below `min` to just above `max`: 200, 220, 240. */
export function niceTicks(min: number, max: number, count = 3): number[] {
  const raw = Math.max(max - min, 1) / Math.max(count - 1, 1);
  const power = 10 ** Math.max(0, Math.floor(Math.log10(raw)));
  // The round step (1, 2 or 5 times a power of ten) nearest the raw one, so the axis stays tight.
  const step = [1, 2, 5, 10]
    .map((m) => m * power)
    .reduce((best, s) => (Math.abs(Math.log(s / raw)) < Math.abs(Math.log(best / raw)) ? s : best));
  const first = Math.floor(min / step) * step;
  const last = Math.max(Math.ceil(max / step) * step, first + step);
  const ticks: number[] = [];
  for (let value = first; value <= last; value += step) ticks.push(value);
  return ticks;
}
