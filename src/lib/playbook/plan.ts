import { eachDay, weekdayOf } from "@/lib/dates";
import type { Playbook } from "./schema";

/** A slot the playbook plans on a day. Not stored: worked out each time it is read. */
export type PlannedSlot = {
  date: string;
  time: string;
  topic: string;
  pillar: string | null;
  series: string | null;
};

/**
 * The playbook's slots from `from` to `to` (both included), in day and time order.
 * This is the future part of the calendar: a playbook change shows at once, with no job
 * to roll the plan forward (docs/SPEC.md section 6).
 */
export function slotsFromPlaybook(week: Playbook["week"], from: string, to: string): PlannedSlot[] {
  return eachDay(from, to).flatMap((date) =>
    week[weekdayOf(date)].map((slot) => ({
      date,
      time: slot.time,
      topic: slot.topic,
      pillar: slot.pillar ?? null,
      series: slot.series ?? null,
    })),
  );
}
