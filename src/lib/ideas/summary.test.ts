import { describe, expect, it } from "vitest";
import { isRating, sortIdeas, type IdeaItem } from "./summary";

const idea = (
  id: string,
  day: string,
  ratings: Partial<Pick<IdeaItem, "claudeRating" | "codexRating" | "myRating">> = {},
) => ({
  id,
  createdAt: `2026-11-${day}T09:00:00.000Z`,
  claudeRating: null,
  codexRating: null,
  myRating: null,
  ...ratings,
});

const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe("isRating", () => {
  it("takes whole numbers from 1 to 10 only", () => {
    expect([1, 5, 10].every(isRating)).toBe(true);
    expect([0, 11, 7.5, -1, Number.NaN, "7", null, undefined].some(isRating)).toBe(false);
  });
});

describe("sortIdeas", () => {
  const items = [
    idea("a", "01", { claudeRating: 6, myRating: 9 }),
    idea("b", "03", { claudeRating: 9 }),
    idea("c", "02", { claudeRating: 6, codexRating: 4 }),
    idea("d", "04", { codexRating: 8 }),
  ];

  it("puts the newest first by default, oldest first when ascending", () => {
    expect(ids(sortIdeas(items))).toEqual(["d", "b", "c", "a"]);
    expect(ids(sortIdeas(items, "created", "asc"))).toEqual(["a", "c", "b", "d"]);
  });

  it("sorts by a rating, highest first, ties newest first, unrated last", () => {
    expect(ids(sortIdeas(items, "claude"))).toEqual(["b", "c", "a", "d"]);
    expect(ids(sortIdeas(items, "codex"))).toEqual(["d", "c", "b", "a"]);
    expect(ids(sortIdeas(items, "my"))).toEqual(["a", "d", "b", "c"]);
  });

  it("keeps unrated ideas last when sorting lowest first", () => {
    expect(ids(sortIdeas(items, "claude", "asc"))).toEqual(["c", "a", "b", "d"]);
    expect(ids(sortIdeas(items, "codex", "asc"))).toEqual(["c", "d", "b", "a"]);
  });

  it("never changes the list it was given", () => {
    const before = ids(items);
    sortIdeas(items, "claude");
    expect(ids(items)).toEqual(before);
  });

  it("orders ideas saved in the same instant by id, so the order is stable", () => {
    const same = [idea("x", "05"), idea("y", "05"), idea("w", "05")];
    expect(ids(sortIdeas(same))).toEqual(["y", "x", "w"]);
    expect(ids(sortIdeas(same, "created", "asc"))).toEqual(["w", "x", "y"]);
  });
});
