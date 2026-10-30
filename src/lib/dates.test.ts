import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  isClockTime,
  isIsoDay,
  isTimeZone,
  localParts,
  mondayOf,
  todayIn,
  weekdayOf,
} from "./dates";

describe("dates", () => {
  it("knows real days and clock times", () => {
    expect(isIsoDay("2026-10-30")).toBe(true);
    expect(isIsoDay("2026-02-30")).toBe(false);
    expect(isIsoDay("2026-13-40")).toBe(false);
    expect(isIsoDay("30-10-2026")).toBe(false);
    expect(isClockTime("12:30")).toBe(true);
    expect(isClockTime("24:00")).toBe(false);
    expect(isClockTime("9:30")).toBe(false);
  });

  it("knows time zones", () => {
    expect(isTimeZone("Europe/Amsterdam")).toBe(true);
    expect(isTimeZone("Mars/Olympus")).toBe(false);
  });

  it("adds days across months and daylight saving", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26");
    expect(daysBetween("2026-10-30", "2026-11-02")).toBe(3);
    expect(eachDay("2026-10-30", "2026-11-01")).toEqual(["2026-10-30", "2026-10-31", "2026-11-01"]);
  });

  it("starts weeks on Monday", () => {
    expect(weekdayOf("2026-10-30")).toBe("fri");
    expect(weekdayOf("2026-11-01")).toBe("sun");
    expect(mondayOf("2026-11-01")).toBe("2026-10-26");
    expect(mondayOf("2026-10-26")).toBe("2026-10-26");
  });

  it("reads the local day and time of an instant", () => {
    const instant = new Date("2026-10-30T23:30:00Z");
    expect(localParts(instant, "Europe/Amsterdam")).toEqual({ date: "2026-10-31", time: "00:30" });
    expect(localParts(instant, "America/New_York")).toEqual({ date: "2026-10-30", time: "19:30" });
    expect(todayIn("UTC", instant)).toBe("2026-10-30");
  });
});
