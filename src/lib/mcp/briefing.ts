import "server-only";
import { and, desc, eq } from "drizzle-orm";
import type { CalendarItem } from "@/lib/calendar/days";
import { getCalendar, storedItems } from "@/lib/calendar/queries";
import { db } from "@/lib/db/client";
import { draft, post } from "@/lib/db/schema";
import { addDays, localParts, todayIn, weekdayOf } from "@/lib/dates";
import { listNotes } from "@/lib/notes/notes";
import { ensurePlaybook } from "@/lib/playbook/playbook";
import { getProfile } from "@/lib/profile/profile";
import { getProgress } from "@/lib/progress/progress";
import { listDecisions, listReviews } from "@/lib/reviews/reviews";
import { draftStats, summarize, type StatPost } from "@/lib/stats/summary";
import { xProfileUrl } from "@/lib/x/x";
import { routineFor, type RoutineMode } from "./routines";

/** A calendar item as Claude sees it: snake_case, and only what's useful. */
export function itemForClaude(item: CalendarItem) {
  return {
    post_id: item.postId || null,
    date: item.date,
    time: item.time,
    status: item.status,
    topic: item.topic,
    pillar: item.pillar,
    series: item.series,
    question: item.question,
    kind: item.kind,
    x_url: item.xUrl,
    text: item.text,
    drafts: item.drafts.map((d) => ({
      draft_id: d.id,
      option: d.position,
      text: d.text,
      reason: d.reason,
      picked: d.picked,
    })),
    numbers: item.metrics
      ? {
          read_at: item.metrics.capturedAt,
          views: item.metrics.views,
          likes: item.metrics.likes,
          replies: item.metrics.replies,
          reposts: item.metrics.reposts,
          bookmarks: item.metrics.bookmarks,
          shares: item.metrics.shares,
          profile_visits: item.metrics.profileVisits,
          new_follows: item.metrics.newFollows,
        }
      : null,
  };
}

/** The user's last posts with the draft each came from: how they really write. */
async function voiceExamples(userId: string) {
  const rows = await db
    .select({ text: post.text, picked: draft.text })
    .from(post)
    .leftJoin(draft, and(eq(draft.postId, post.id), eq(draft.picked, true)))
    .where(and(eq(post.userId, userId), eq(post.status, "posted")))
    .orderBy(desc(post.postedAt))
    .limit(10);
  return {
    recent_posts: rows.flatMap((r) => (r.text ? [r.text] : [])),
    edits: rows.flatMap((r) =>
      r.text && r.picked && r.picked.trim() !== r.text.trim()
        ? [{ draft: r.picked, posted: r.text }]
        : [],
    ),
  };
}

/**
 * Everything a routine needs, in one call (docs/mcp.md): where the account stands, the plan,
 * today and the coming week, what worked, what's waiting, and the routine's steps.
 */
export async function getBriefing(userId: string, mode: RoutineMode, now: Date = new Date()) {
  const profile = await getProfile(userId);
  const timeZone = profile?.timeZone ?? "UTC";
  const handle = profile?.xHandle ?? null;
  const today = todayIn(timeZone, now);

  const [playbook, calendar, progress, past, notes, pending, [lastReview], voice] =
    await Promise.all([
      ensurePlaybook(userId),
      getCalendar(userId, timeZone, today, addDays(today, 7), now),
      getProgress(userId, timeZone, now),
      storedItems(userId, timeZone, addDays(today, -28), addDays(today, -1)),
      listNotes(userId, { unusedOnly: true, limit: 10 }),
      listDecisions(userId, { status: "pending", limit: 10 }),
      listReviews(userId, 1),
      voiceExamples(userId),
    ]);

  const posted = past.filter((r) => r.status === "posted");
  const statPosts: StatPost[] = posted.map((r) => ({
    pillar: r.pillar,
    series: r.series,
    time: r.time,
    weekday: weekdayOf(r.date),
    kind: r.kind,
    metrics: r.metrics,
  }));
  const byViews = posted
    .filter((r) => r.metrics?.views != null)
    .sort((a, b) => b.metrics!.views! - a.metrics!.views!);
  const brief = (r: (typeof posted)[number]) => ({
    date: r.date,
    pillar: r.pillar,
    kind: r.kind,
    text: r.text,
    views: r.metrics?.views ?? null,
    new_follows: r.metrics?.newFollows ?? null,
  });
  const [todayDay, ...nextDays] = calendar.days;
  const recentPosts = (await storedItems(userId, timeZone, addDays(today, -7), today)).filter(
    (r) => r.status === "posted",
  );

  return {
    now: {
      date: today,
      time: localParts(now, timeZone).time,
      weekday: weekdayOf(today),
      time_zone: timeZone,
    },
    profile: { x_handle: handle, x_url: handle ? xProfileUrl(handle) : null },
    progress: {
      followers: progress.followers,
      change_7d: progress.change7d,
      change_30d: progress.change30d,
      goal: progress.goal,
      needed_per_week: progress.neededPerWeek,
      last_7_days: { posts: progress.last7.posts, median_views: progress.last7.medianViews },
      numbers_read_at: progress.numbersReadAt?.toISOString() ?? null,
    },
    playbook: {
      version: playbook.version,
      summary: playbook.summary,
      updated_at: playbook.createdAt.toISOString(),
      content: playbook.content,
    },
    today: (todayDay?.items ?? []).map(itemForClaude),
    next_7_days: nextDays.map((day) => ({
      date: day.date,
      slots: day.items.map((i) => ({
        post_id: i.postId || null,
        time: i.time,
        topic: i.topic,
        status: i.status,
      })),
    })),
    recent_posts: recentPosts.map((r) => ({
      post_id: r.postId,
      date: r.date,
      time: r.time,
      x_url: r.xUrl,
      text: r.text,
      views: r.metrics?.views ?? null,
      numbers_read_at: r.metrics?.capturedAt ?? null,
    })),
    results_28_days: {
      posts: posted.length,
      by_pillar: summarize(statPosts, "pillar"),
      by_time: summarize(statPosts, "time"),
      best: byViews.slice(0, 3).map(brief),
      worst: byViews.length > 3 ? byViews.slice(-3).reverse().map(brief) : [],
      drafts: draftStats(
        past.map((r) => ({
          drafted: r.drafts.length > 0,
          posted: r.status === "posted",
          pickedText: r.drafts.find((d) => d.picked)?.text ?? null,
          finalText: r.text,
        })),
      ),
    },
    unused_notes: notes.map((n) => ({
      note_id: n.id,
      kind: n.kind,
      text: n.text,
      post_id: n.postId,
      created_at: n.createdAt.toISOString(),
    })),
    pending_decisions: pending.map((d) => ({
      decision_id: d.id,
      change: d.change,
      reason: d.reason,
    })),
    last_review: lastReview
      ? {
          period: `${lastReview.periodStart} to ${lastReview.periodEnd}`,
          summary: lastReview.summary,
          findings: lastReview.findings,
        }
      : null,
    voice_examples: voice,
    routine: { mode, steps: routineFor(mode, { handle }) },
  };
}
