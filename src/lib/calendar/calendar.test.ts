import { describe, expect, it } from "vitest";
import { DEFAULT_PLAYBOOK } from "@/lib/playbook/default";
import { slotsFromPlaybook } from "@/lib/playbook/plan";
import { buildDays, type StoredItem } from "./days";
import { parseAnchor, parseView, rangeFor } from "./range";

const row = (over: Partial<StoredItem>): StoredItem => ({
  postId: "p1",
  date: "2026-10-30",
  slotTime: "12:30",
  time: "12:30",
  status: "drafted",
  topic: "Custom topic",
  pillar: null,
  series: null,
  question: null,
  kind: "post",
  xUrl: null,
  postedAt: null,
  text: null,
  drafts: [],
  metrics: null,
  ...over,
});

describe("rangeFor", () => {
  // 2026-10-30 is a Friday.
  it("shows one day", () => {
    const r = rangeFor("day", "2026-10-30");
    expect([r.from, r.to, r.prev, r.next]).toEqual([
      "2026-10-30",
      "2026-10-30",
      "2026-10-29",
      "2026-10-31",
    ]);
    expect(r.label).toBe("Friday 30 October");
  });

  it("shows Monday to Sunday", () => {
    const r = rangeFor("week", "2026-10-30");
    expect([r.from, r.to, r.prev, r.next]).toEqual([
      "2026-10-26",
      "2026-11-01",
      "2026-10-23",
      "2026-11-06",
    ]);
  });

  it("shows 5 weeks from the Monday of the week before", () => {
    const r = rangeFor("month", "2026-10-30");
    expect([r.from, r.to]).toEqual(["2026-10-19", "2026-11-22"]);
    expect([r.prev, r.next]).toEqual(["2026-10-02", "2026-11-27"]);
    expect(r.label).toBe("19 Oct – 22 Nov");
  });

  it("reads the view and date from the address safely", () => {
    expect(parseView("week")).toBe("week");
    expect(parseView(["day"])).toBe("day");
    expect(parseView("year")).toBe("month");
    expect(parseAnchor("2026-11-03", "2026-10-30")).toBe("2026-11-03");
    expect(parseAnchor("2026-13-40", "2026-10-30")).toBe("2026-10-30");
    expect(parseAnchor(undefined, "2026-10-30")).toBe("2026-10-30");
  });
});

describe("buildDays", () => {
  const today = "2026-10-30";
  const planned = slotsFromPlaybook(DEFAULT_PLAYBOOK.week, "2026-10-29", "2026-10-31");

  it("shows the playbook's slots from today on, and only posts on past days", () => {
    const days = buildDays({ from: "2026-10-29", to: "2026-10-31", today, planned, rows: [] });
    expect(days.map((d) => [d.date, d.isPast, d.isToday, d.items.length])).toEqual([
      ["2026-10-29", true, false, 0],
      ["2026-10-30", false, true, 2],
      ["2026-10-31", false, false, 2],
    ]);
    expect(days[1]!.items[0]).toMatchObject({
      key: "2026-10-30 12:30",
      fromPlaybook: true,
      status: "planned",
    });
  });

  it("lets a stored row replace its slot, and a skipped one hide it", () => {
    const rows = [
      row({ postId: "a", slotTime: "12:30", time: "12:30", status: "drafted" }),
      row({ postId: "b", slotTime: "19:00", time: "19:00", status: "skipped" }),
    ];
    const [, todayDay] = buildDays({ from: "2026-10-29", to: "2026-10-30", today, planned, rows });
    expect(todayDay!.items.map((i) => [i.key, i.status, i.fromPlaybook])).toEqual([
      ["a", "drafted", false],
    ]);
  });

  it("adds custom slots and unplanned posts in time order", () => {
    const rows = [
      row({ postId: "late", slotTime: null, time: "21:05", status: "posted", kind: "quote" }),
      row({ postId: "early", slotTime: "08:00", time: "08:00", status: "planned" }),
    ];
    const [day] = buildDays({ from: today, to: today, today, planned, rows });
    expect(day!.items.map((i) => i.key)).toEqual([
      "early",
      "2026-10-30 12:30",
      "2026-10-30 19:00",
      "late",
    ]);
  });

  it("shows only posted rows on past days", () => {
    const rows = [
      row({ postId: "posted", date: "2026-10-29", status: "posted" }),
      row({
        postId: "unused",
        date: "2026-10-29",
        slotTime: "19:00",
        time: "19:00",
        status: "drafted",
      }),
    ];
    const [past] = buildDays({ from: "2026-10-29", to: "2026-10-29", today, planned, rows });
    expect(past!.items.map((i) => i.key)).toEqual(["posted"]);
  });
});
