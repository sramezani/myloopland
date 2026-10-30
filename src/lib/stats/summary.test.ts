import { describe, expect, it } from "vitest";
import { draftStats, followerChange, median, summarize, type StatPost } from "./summary";

const post = (over: Partial<StatPost>): StatPost => ({
  pillar: "build",
  series: null,
  time: "12:30",
  weekday: "mon",
  kind: "post",
  metrics: null,
  ...over,
});
const numbers = (views: number | null, newFollows: number | null = null) => ({
  views,
  likes: views === null ? null : Math.round(views / 10),
  replies: null,
  reposts: null,
  bookmarks: null,
  profileVisits: null,
  newFollows,
});

describe("summarize", () => {
  it("groups posts and skips unknown numbers instead of counting them as zero", () => {
    const posts = [
      post({ metrics: numbers(100, 2) }),
      post({ metrics: numbers(50, 1) }),
      post({ metrics: null }),
      post({ pillar: "life", metrics: numbers(300) }),
      post({ pillar: null, metrics: numbers(10) }),
    ];
    const groups = summarize(posts, "pillar");
    expect(groups.map((g) => g.key)).toEqual(["build", "(none)", "life"]);
    expect(groups[0]).toMatchObject({
      posts: 3,
      withNumbers: 2,
      medianViews: 75,
      avgLikes: 7.5,
      avgReplies: null,
      newFollows: 3,
    });
    expect(groups[2]).toMatchObject({ key: "life", newFollows: null });
  });

  it("groups times by the hour", () => {
    const posts = [post({ time: "12:30" }), post({ time: "12:05" }), post({ time: "19:00" })];
    expect(summarize(posts, "time").map((g) => [g.key, g.posts])).toEqual([
      ["12:00", 2],
      ["19:00", 1],
    ]);
  });

  it("takes the middle value as the median", () => {
    expect(median([])).toBeNull();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});

describe("draftStats", () => {
  it("counts drafts used, and edits that change more than spacing", () => {
    expect(
      draftStats([
        { drafted: true, posted: true, pickedText: "Hello  world", finalText: "Hello world" },
        { drafted: true, posted: true, pickedText: "Hello", finalText: "Hello there" },
        { drafted: true, posted: false, pickedText: null, finalText: null },
        { drafted: false, posted: true, pickedText: null, finalText: "Own post" },
      ]),
    ).toEqual({ slotsWithDrafts: 3, postedFromDraft: 2, editedBeforePosting: 1 });
  });
});

describe("followerChange", () => {
  const now = new Date("2026-10-30T20:00:00Z");
  const at = (iso: string, followers: number) => ({ capturedAt: new Date(iso), followers });

  it("compares the newest count with the newest one from before the window", () => {
    const readings = [
      at("2026-10-30T19:00:00Z", 243),
      at("2026-10-23T19:00:00Z", 237),
      at("2026-10-20T19:00:00Z", 230),
    ];
    expect(followerChange(readings, now, 7)).toBe(6);
    expect(followerChange(readings, now, 30)).toBeNull();
    expect(followerChange([], now, 7)).toBeNull();
  });
});
