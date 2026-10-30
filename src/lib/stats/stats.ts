import "server-only";
import { storedItems } from "@/lib/calendar/queries";
import { weekdayOf } from "@/lib/dates";
import { draftStats, summarize, type StatDimension, type StatPost } from "./summary";

/** What worked from `from` to `to`, grouped by one dimension (see summary.ts). */
export async function getStats(
  userId: string,
  timeZone: string,
  from: string,
  to: string,
  by: StatDimension,
) {
  const rows = await storedItems(userId, timeZone, from, to);
  const posted = rows.filter((r) => r.status === "posted");
  const posts: StatPost[] = posted.map((r) => ({
    pillar: r.pillar,
    series: r.series,
    time: r.time,
    weekday: weekdayOf(r.date),
    kind: r.kind,
    metrics: r.metrics,
  }));
  return {
    from,
    to,
    by,
    posts: posted.length,
    groups: summarize(posts, by),
    drafts: draftStats(
      rows.map((r) => ({
        drafted: r.drafts.length > 0,
        posted: r.status === "posted",
        pickedText: r.drafts.find((d) => d.picked)?.text ?? null,
        finalText: r.text,
      })),
    ),
  };
}
