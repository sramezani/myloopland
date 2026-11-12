import { describe, expect, it } from "vitest";
import { findNearDuplicate, isNearDuplicate, titleWords } from "./similar";

describe("titleWords", () => {
  it("drops case, accents, punctuation, small words and plural s", () => {
    expect(titleWords("The 5 Tools I use for Threads!")).toEqual(["5", "tool", "use", "thread"]);
    expect(titleWords("Café naïve résumés")).toEqual(["cafe", "naive", "resume"]);
    expect(titleWords("Claude's pick")).toEqual(["claude", "pick"]);
  });

  it("keeps words like 'class' and 'this' whole, and a title of only small words", () => {
    expect(titleWords("A class on pricing")).toEqual(["class", "pricing"]);
    expect(titleWords("It is what it is")).toEqual(["what"]);
    expect(titleWords("To be or not to be")).toEqual(["not"]);
    expect(titleWords("To be")).toEqual(["to", "be"]);
  });
});

describe("isNearDuplicate", () => {
  it("matches the same title written differently", () => {
    expect(isNearDuplicate("Building in public", "building in public.")).toBe(true);
    expect(isNearDuplicate("Why I build in public", "Build in public: why")).toBe(true);
    expect(isNearDuplicate("My first 100 followers", "The first 100 followers")).toBe(true);
    expect(isNearDuplicate("AI agents for founders", "AI agent for founders")).toBe(true);
  });

  it("matches a title with a typo, or one extra word", () => {
    expect(isNearDuplicate("Bulding in public", "Building in public")).toBe(true);
    expect(isNearDuplicate("Onbaording emails that work", "Onboarding emails that work")).toBe(
      true,
    );
    expect(
      isNearDuplicate(
        "The 5 tools I use every day to ship side projects",
        "The 5 tools I use every day to ship side projects faster",
      ),
    ).toBe(true);
  });

  it("keeps ideas that are about something else", () => {
    expect(isNearDuplicate("Shipping my first SaaS", "Pricing my first SaaS")).toBe(false);
    expect(isNearDuplicate("Why I stopped using React", "Why I started using React")).toBe(false);
    expect(
      isNearDuplicate("How I got my first 100 followers", "How I got my first 1000 followers"),
    ).toBe(false);
    expect(isNearDuplicate("Pricing", "Pricing page teardown")).toBe(false);
    expect(isNearDuplicate("Code review habits", "Mode review habits")).toBe(false);
  });

  it("never matches an empty title", () => {
    expect(isNearDuplicate("", "")).toBe(false);
    expect(isNearDuplicate("!!!", "Pricing")).toBe(false);
  });
});

describe("findNearDuplicate", () => {
  it("returns the first listed idea that matches", () => {
    const listed = [
      { id: "1", title: "Pricing my first SaaS" },
      { id: "2", title: "Building in public" },
      { id: "3", title: "building in public!" },
    ];
    expect(findNearDuplicate("Building in public!!", listed)?.id).toBe("2");
    expect(findNearDuplicate("A week without Slack", listed)).toBeUndefined();
  });
});
