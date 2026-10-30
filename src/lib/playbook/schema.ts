import { z } from "zod";
import { isClockTime, isIsoDay, WEEKDAYS } from "@/lib/dates";

/**
 * The playbook: one user's strategy, written by their Claude (docs/SPEC.md section 5).
 * Every change is a new version; the newest one is active. Nothing here is enforced on the
 * user: any number of slots a day, at any times, and the pillar shares are only a guide.
 */

const clockTime = z
  .string()
  .refine(isClockTime, "Use a 24-hour time like 12:30")
  .describe("Local time, 24-hour HH:MM");

export const slotSchema = z.object({
  time: clockTime,
  topic: z.string().trim().min(1).max(200).describe("What this slot is about, eg Weekly recap"),
  pillar: z.string().trim().min(1).max(40).optional().describe("A pillar key from `pillars`"),
  series: z.string().trim().min(1).max(80).optional().describe("A repeating format, if any"),
});

const daySlots = z
  .array(slotSchema)
  .max(12)
  .refine(
    (slots) => new Set(slots.map((s) => s.time)).size === slots.length,
    "Two slots on the same day share a time",
  )
  .transform((slots) => [...slots].sort((a, b) => a.time.localeCompare(b.time)));

const week = z.object(
  Object.fromEntries(WEEKDAYS.map((day) => [day, daySlots])) as Record<
    (typeof WEEKDAYS)[number],
    typeof daySlots
  >,
);

export const pillarSchema = z.object({
  key: z
    .string()
    .regex(/^[a-z0-9-]{1,40}$/, "Lower-case letters, digits and dashes, eg build-in-public"),
  label: z.string().trim().min(1).max(60),
  share: z.number().int().min(0).max(100).describe("Rough % of posts; a guide, not a rule"),
});

export const playbookSchema = z.object({
  goal: z
    .object({
      followers: z.number().int().positive().max(1_000_000_000),
      by: z.string().refine(isIsoDay, "Use a date like 2027-10-30"),
    })
    .nullable()
    .describe("The follower goal and the day to reach it, or null"),
  about: z
    .string()
    .max(2000)
    .describe("Who the user is, what they build and who they want to reach"),
  voice: z.string().max(2000).describe("How the user writes, or which writing skill to use"),
  pillars: z.array(pillarSchema).max(12),
  week: week.describe("Slots for each weekday, mon to sun. Zero or more slots a day"),
  rules: z.array(z.string().trim().min(1).max(300)).max(30),
  notes: z.string().max(4000).describe("What works so far, experiments running, anything else"),
});

export type Playbook = z.output<typeof playbookSchema>;
export type PlaybookInput = z.input<typeof playbookSchema>;
export type PlaybookSlot = z.output<typeof slotSchema>;
