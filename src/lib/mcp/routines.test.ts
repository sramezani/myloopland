import { describe, expect, it } from "vitest";
import { ROUTINE_MODES, routineFor, SERVER_INSTRUCTIONS } from "./routines";

const ctx = { handle: "siaramzee" };

describe("routineFor", () => {
  it("numbers every routine's steps 1, 2, 3… with no gaps", () => {
    for (const mode of ROUTINE_MODES) {
      const numbers = [...routineFor(mode, ctx).matchAll(/^(\d+)\. /gm)].map((m) => Number(m[1]));
      expect(numbers, mode).toEqual(numbers.map((_, i) => i + 1));
    }
  });

  it("has setup read 4 weeks on the analytics page, not scroll the profile or ask for an export", () => {
    const setup = routineFor("setup", ctx);
    expect(setup).toContain("type=posts&sort=date&dir=desc&days=28");
    expect(setup).toContain("type=community&sort=date&dir=desc&days=28");
    expect(setup).toContain("Don't scroll");
    expect(setup).not.toMatch(/export/i);
    expect(setup).toContain("Run my myloopland daily routine");
  });

  it("has the daily run read numbers, review when due, then draft", () => {
    const daily = routineFor("daily", ctx);
    const order = ["days=7", "save_review", "save_drafts", "Reply in a few lines"].map((s) =>
      daily.indexOf(s),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(daily).toContain("@siaramzee");
  });

  it("names the handle placeholder before the user has one", () => {
    expect(routineFor("evening", { handle: null })).toContain("@<handle>");
  });
});

describe("SERVER_INSTRUCTIONS", () => {
  it("fits in what Claude Code reads", () => {
    expect(SERVER_INSTRUCTIONS.length).toBeLessThan(4096);
  });
});
