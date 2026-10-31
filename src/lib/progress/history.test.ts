import { describe, expect, it } from "vitest";
import { consecutiveRuns, dailyFollowers, niceTicks } from "./history";

describe("dailyFollowers", () => {
  it("keeps the newest reading of each local day, oldest day first", () => {
    const days = dailyFollowers(
      [
        { capturedAt: new Date("2026-10-31T20:30:00Z"), followers: 245 },
        { capturedAt: new Date("2026-10-30T07:00:00Z"), followers: 240 },
        { capturedAt: new Date("2026-10-30T20:00:00Z"), followers: 241 },
        // 23:30 UTC on the 30th is already the 31st in Amsterdam.
        { capturedAt: new Date("2026-10-30T23:30:00Z"), followers: 242 },
      ],
      "Europe/Amsterdam",
    );
    expect(days).toEqual([
      { date: "2026-10-30", followers: 241 },
      { date: "2026-10-31", followers: 245 },
    ]);
  });
});

describe("consecutiveRuns", () => {
  it("breaks the line where a day has no reading", () => {
    const runs = consecutiveRuns([
      { date: "2026-10-28", followers: 1 },
      { date: "2026-10-29", followers: 2 },
      { date: "2026-10-31", followers: 3 },
    ]);
    expect(runs.map((run) => run.map((d) => d.date))).toEqual([
      ["2026-10-28", "2026-10-29"],
      ["2026-10-31"],
    ]);
  });
});

describe("niceTicks", () => {
  it("covers the range with round whole numbers", () => {
    expect(niceTicks(209, 243)).toEqual([200, 220, 240, 260]);
    expect(niceTicks(1180, 1420)).toEqual([1100, 1200, 1300, 1400, 1500]);
  });

  it("still has a range when the count didn't move", () => {
    expect(niceTicks(243, 243)).toEqual([243, 244]);
  });
});
