import "server-only";
import { and, asc, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { draft, post, postMetric } from "@/lib/db/schema";
import { localParts, todayIn } from "@/lib/dates";
import { DEFAULT_PLAYBOOK } from "@/lib/playbook/default";
import { slotsFromPlaybook } from "@/lib/playbook/plan";
import { getActivePlaybook } from "@/lib/playbook/playbook";
import { buildDays, type CalendarDay, type StoredItem } from "./days";

/**
 * The user's stored posts from `from` to `to` (local days), with their drafts and their
 * newest numbers. `time` is the slot time, or the local time it was posted.
 */
export async function storedItems(
  userId: string,
  timeZone: string,
  from: string,
  to: string,
): Promise<StoredItem[]> {
  const posts = await db
    .select()
    .from(post)
    .where(and(eq(post.userId, userId), gte(post.date, from), lte(post.date, to)));
  if (posts.length === 0) return [];
  const ids = posts.map((p) => p.id);
  const [drafts, latest] = await Promise.all([
    db.select().from(draft).where(inArray(draft.postId, ids)).orderBy(asc(draft.position)),
    db
      .selectDistinctOn([postMetric.postId])
      .from(postMetric)
      .where(inArray(postMetric.postId, ids))
      .orderBy(postMetric.postId, desc(postMetric.capturedAt)),
  ]);
  const metricsByPost = new Map(latest.map((m) => [m.postId, m]));
  return posts.map((p) => {
    const m = metricsByPost.get(p.id);
    return {
      postId: p.id,
      date: p.date,
      slotTime: p.slotTime,
      time: p.slotTime ?? (p.postedAt ? localParts(p.postedAt, timeZone).time : null),
      status: p.status,
      topic: p.topic,
      pillar: p.pillar,
      series: p.series,
      question: p.question,
      kind: p.kind,
      xUrl: p.xUrl,
      postedAt: p.postedAt?.toISOString() ?? null,
      text: p.text,
      drafts: drafts
        .filter((d) => d.postId === p.id)
        .map((d) => ({
          id: d.id,
          position: d.position,
          text: d.text,
          reason: d.reason,
          picked: d.picked,
        })),
      metrics: m
        ? {
            capturedAt: m.capturedAt.toISOString(),
            views: m.views,
            likes: m.likes,
            replies: m.replies,
            reposts: m.reposts,
            bookmarks: m.bookmarks,
            shares: m.shares,
            profileVisits: m.profileVisits,
            newFollows: m.newFollows,
          }
        : null,
    };
  });
}

/** The calendar from `from` to `to`: stored posts, plus the playbook's slots from today on. */
export async function getCalendar(
  userId: string,
  timeZone: string,
  from: string,
  to: string,
  now: Date = new Date(),
): Promise<{ today: string; days: CalendarDay[] }> {
  const today = todayIn(timeZone, now);
  const [active, rows] = await Promise.all([
    getActivePlaybook(userId),
    storedItems(userId, timeZone, from, to),
  ]);
  const week = (active?.content ?? DEFAULT_PLAYBOOK).week;
  const planned = to >= today ? slotsFromPlaybook(week, from > today ? from : today, to) : [];
  return { today, days: buildDays({ from, to, today, planned, rows }) };
}
