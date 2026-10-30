import type { PostKind } from "@/lib/db/schema";
import type { Weekday } from "@/lib/dates";

/**
 * What worked: posts grouped by one dimension with their numbers (docs/SPEC.md section 5).
 * Pure, so Claude's weekly review and the briefing get the same answer, and it is tested.
 * Every average skips posts without that number: unknown is never a zero.
 */

export const STAT_DIMENSIONS = ["pillar", "series", "time", "weekday", "kind"] as const;
export type StatDimension = (typeof STAT_DIMENSIONS)[number];

export type StatMetrics = {
  views: number | null;
  likes: number | null;
  replies: number | null;
  reposts: number | null;
  bookmarks: number | null;
  profileVisits: number | null;
  newFollows: number | null;
};

export type StatPost = {
  pillar: string | null;
  series: string | null;
  time: string | null;
  weekday: Weekday;
  kind: PostKind;
  /** The latest snapshot of the post's numbers, or null before the first reading. */
  metrics: StatMetrics | null;
};

export type StatGroup = {
  key: string;
  posts: number;
  /** Posts that have at least one reading. */
  withNumbers: number;
  medianViews: number | null;
  avgLikes: number | null;
  avgReplies: number | null;
  avgReposts: number | null;
  avgBookmarks: number | null;
  profileVisits: number | null;
  newFollows: number | null;
};

const NONE = "(none)";

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function known(posts: StatPost[], pick: (m: StatMetrics) => number | null): number[] {
  return posts.flatMap((p) => {
    const value = p.metrics ? pick(p.metrics) : null;
    return value === null ? [] : [value];
  });
}

const average = (values: number[]) =>
  values.length ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : null;
const total = (values: number[]) => (values.length ? values.reduce((a, b) => a + b, 0) : null);

function keyOf(post: StatPost, by: StatDimension): string {
  if (by === "time") return post.time ? `${post.time.slice(0, 2)}:00` : NONE;
  return post[by] ?? NONE;
}

/** Posts grouped by `by`, the biggest groups first. Times are grouped by the hour. */
export function summarize(posts: StatPost[], by: StatDimension): StatGroup[] {
  const groups = new Map<string, StatPost[]>();
  for (const post of posts) {
    const key = keyOf(post, by);
    groups.set(key, [...(groups.get(key) ?? []), post]);
  }
  return [...groups.entries()]
    .map(([key, group]) => ({
      key,
      posts: group.length,
      withNumbers: group.filter((p) => p.metrics).length,
      medianViews: median(known(group, (m) => m.views)),
      avgLikes: average(known(group, (m) => m.likes)),
      avgReplies: average(known(group, (m) => m.replies)),
      avgReposts: average(known(group, (m) => m.reposts)),
      avgBookmarks: average(known(group, (m) => m.bookmarks)),
      profileVisits: total(known(group, (m) => m.profileVisits)),
      newFollows: total(known(group, (m) => m.newFollows)),
    }))
    .sort((a, b) => b.posts - a.posts || a.key.localeCompare(b.key));
}

export type DraftedSlot = {
  /** Claude wrote drafts for it. */
  drafted: boolean;
  posted: boolean;
  pickedText: string | null;
  finalText: string | null;
};

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

/** How the user used Claude's drafts: written, posted from a draft, and edited first. */
export function draftStats(slots: DraftedSlot[]) {
  const drafted = slots.filter((s) => s.drafted);
  const picked = drafted.filter((s) => s.posted && s.pickedText !== null);
  const edited = picked.filter(
    (s) => s.finalText !== null && normalise(s.finalText) !== normalise(s.pickedText!),
  );
  return {
    slotsWithDrafts: drafted.length,
    postedFromDraft: picked.length,
    editedBeforePosting: edited.length,
  };
}

/**
 * Followers gained over `days`: the newest count minus the newest count from at least `days`
 * ago. Null without both readings (never a guess).
 */
export function followerChange(
  readings: { capturedAt: Date; followers: number }[],
  now: Date,
  days: number,
): number | null {
  if (readings.length === 0) return null;
  const sorted = [...readings].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime());
  const cutoff = now.getTime() - days * 86_400_000;
  const before = sorted.find((r) => r.capturedAt.getTime() <= cutoff);
  return before ? sorted[0]!.followers - before.followers : null;
}
