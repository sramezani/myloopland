import "server-only";
import { and, asc, desc, eq, gte, max } from "drizzle-orm";
import { storedItems } from "@/lib/calendar/queries";
import { db } from "@/lib/db/client";
import { accountStat, post, postMetric } from "@/lib/db/schema";
import { addDays, daysBetween, todayIn } from "@/lib/dates";
import { getActivePlaybook } from "@/lib/playbook/playbook";
import { followerChange, median } from "@/lib/stats/summary";
import { dailyFollowers, type FollowerDay } from "./history";

export type Progress = {
  followers: number | null;
  change7d: number | null;
  change30d: number | null;
  goal: { followers: number; by: string } | null;
  /** Followers to gain each week to reach the goal on time, or null without a goal or count. */
  neededPerWeek: number | null;
  last7: { posts: number; medianViews: number | null };
  /** When Claude last read the numbers on X. */
  numbersReadAt: Date | null;
};

/** Where the account stands against its goal: the progress line and the briefing. */
export async function getProgress(
  userId: string,
  timeZone: string,
  now: Date = new Date(),
): Promise<Progress> {
  const today = todayIn(timeZone, now);
  const [readings, active, recent, [lastRead]] = await Promise.all([
    db
      .select({ capturedAt: accountStat.capturedAt, followers: accountStat.followers })
      .from(accountStat)
      .where(eq(accountStat.userId, userId))
      .orderBy(desc(accountStat.capturedAt))
      .limit(120),
    getActivePlaybook(userId),
    storedItems(userId, timeZone, addDays(today, -6), today),
    db
      .select({ at: max(postMetric.capturedAt) })
      .from(postMetric)
      .innerJoin(post, eq(post.id, postMetric.postId))
      .where(eq(post.userId, userId)),
  ]);

  const followers = readings[0]?.followers ?? null;
  const goal = active?.content.goal ?? null;
  let neededPerWeek: number | null = null;
  if (goal && followers !== null) {
    const weeks = Math.max(1, daysBetween(today, goal.by) / 7);
    neededPerWeek = Math.max(0, Math.ceil((goal.followers - followers) / weeks));
  }
  const posted = recent.filter((r) => r.status === "posted");
  const views = posted.flatMap((r) => (r.metrics?.views != null ? [r.metrics.views] : []));

  return {
    followers,
    change7d: followerChange(readings, now, 7),
    change30d: followerChange(readings, now, 30),
    goal,
    neededPerWeek,
    last7: { posts: posted.length, medianViews: median(views) },
    numbersReadAt: lastRead?.at ?? null,
  };
}

/** Followers by day for the dashboard chart: the last reading of each of the last `days` days. */
export async function getFollowerHistory(
  userId: string,
  timeZone: string,
  days = 90,
  now: Date = new Date(),
): Promise<FollowerDay[]> {
  const from = addDays(todayIn(timeZone, now), -(days - 1));
  const readings = await db
    .select({ capturedAt: accountStat.capturedAt, followers: accountStat.followers })
    .from(accountStat)
    .where(
      and(
        eq(accountStat.userId, userId),
        // A day more than asked, so time zones never cut off the first day.
        gte(accountStat.capturedAt, new Date(now.getTime() - (days + 1) * 86_400_000)),
      ),
    )
    .orderBy(asc(accountStat.capturedAt));
  return dailyFollowers(readings, timeZone).filter((day) => day.date >= from);
}
