import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYBOOK } from "./default";
import { slotsFromPlaybook } from "./plan";
import { playbookSchema } from "./schema";

describe("playbook schema", () => {
  it("accepts the default playbook as it is", () => {
    expect(playbookSchema.parse(DEFAULT_PLAYBOOK)).toEqual(DEFAULT_PLAYBOOK);
  });

  it("allows any number of slots a day, including none", () => {
    const week = { ...DEFAULT_PLAYBOOK.week, sat: [], sun: [] };
    expect(playbookSchema.safeParse({ ...DEFAULT_PLAYBOOK, week }).success).toBe(true);
  });

  it("sorts a day's slots by time", () => {
    const mon = [
      { time: "19:00", topic: "Evening" },
      { time: "08:15", topic: "Morning" },
    ];
    const parsed = playbookSchema.parse({
      ...DEFAULT_PLAYBOOK,
      week: { ...DEFAULT_PLAYBOOK.week, mon },
    });
    expect(parsed.week.mon.map((s) => s.time)).toEqual(["08:15", "19:00"]);
  });

  it("rejects bad times, duplicate times and a bad goal date", () => {
    const at = (time: string) => ({ ...DEFAULT_PLAYBOOK.week, mon: [{ time, topic: "x" }] });
    expect(playbookSchema.safeParse({ ...DEFAULT_PLAYBOOK, week: at("25:00") }).success).toBe(
      false,
    );
    const twice = {
      ...DEFAULT_PLAYBOOK.week,
      mon: [
        { time: "12:30", topic: "a" },
        { time: "12:30", topic: "b" },
      ],
    };
    expect(playbookSchema.safeParse({ ...DEFAULT_PLAYBOOK, week: twice }).success).toBe(false);
    const goal = { followers: 1000, by: "2027-02-30" };
    expect(playbookSchema.safeParse({ ...DEFAULT_PLAYBOOK, goal }).success).toBe(false);
  });
});

describe("slotsFromPlaybook", () => {
  it("lays the week's slots on each day, in order", () => {
    // 2026-10-30 is a Friday, 2026-11-01 a Sunday.
    const slots = slotsFromPlaybook(DEFAULT_PLAYBOOK.week, "2026-10-30", "2026-11-01");
    expect(slots).toHaveLength(6);
    expect(slots[0]).toEqual({
      date: "2026-10-30",
      time: "12:30",
      topic: "A take on a trend in my field",
      pillar: "takes",
      series: null,
    });
    expect(slots.map((s) => `${s.date} ${s.time}`)).toEqual([
      "2026-10-30 12:30",
      "2026-10-30 19:00",
      "2026-10-31 12:30",
      "2026-10-31 19:00",
      "2026-11-01 12:30",
      "2026-11-01 19:00",
    ]);
  });

  it("gives nothing for days with no slots or an empty range", () => {
    const week = { ...DEFAULT_PLAYBOOK.week, fri: [] };
    expect(slotsFromPlaybook(week, "2026-10-30", "2026-10-30")).toEqual([]);
    expect(slotsFromPlaybook(DEFAULT_PLAYBOOK.week, "2026-11-02", "2026-11-01")).toEqual([]);
  });
});
