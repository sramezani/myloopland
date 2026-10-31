import { describe, expect, it } from "vitest";
import {
  formatAgo,
  formatCompact,
  formatDay,
  formatDayName,
  formatDayRange,
  formatLongDay,
  formatMaybe,
  formatMonthYear,
  formatSigned,
  formatTime,
  formatWeekday,
} from "./format";

describe("format", () => {
  it("formats numbers, and unknown numbers as a dash", () => {
    expect(formatCompact(1234)).toBe("1,234");
    expect(formatCompact(123_456)).toBe("123.5K");
    expect(formatMaybe(null)).toBe("—");
    expect(formatMaybe(0)).toBe("0");
  });

  it("formats days", () => {
    expect(formatDay("2026-10-04")).toBe("4 Oct");
    expect(formatDayName("2026-10-30")).toBe("Fri 30 Oct");
    expect(formatLongDay("2026-10-30")).toBe("Friday 30 October");
    expect(formatDayRange("2026-10-26", "2026-11-29")).toBe("26 Oct – 29 Nov");
    expect(formatDayRange("2026-12-28", "2027-01-03")).toBe("28 Dec 2026 – 3 Jan 2027");
    expect(formatMonthYear("2027-10-30")).toBe("Oct 2027");
    expect(formatWeekday("mon")).toBe("Monday");
    expect(formatWeekday("sun")).toBe("Sunday");
  });

  it("formats times in a time zone", () => {
    expect(formatTime(new Date("2026-10-30T11:30:00Z"), "Europe/Amsterdam")).toBe("12:30");
  });

  it("formats how long ago and signed changes", () => {
    const now = new Date("2026-10-30T12:00:00Z");
    expect(formatAgo(new Date("2026-10-30T11:59:40Z"), now)).toBe("just now");
    expect(formatAgo(new Date("2026-10-30T09:00:00Z"), now)).toBe("3 h ago");
    expect(formatAgo(new Date("2026-10-28T12:00:00Z"), now)).toBe("2 days ago");
    expect(formatSigned(6)).toBe("+6");
    expect(formatSigned(-3)).toBe("−3");
    expect(formatSigned(0)).toBe("±0");
  });
});
