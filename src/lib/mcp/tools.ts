import "server-only";
import type { CallToolResult, McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getCalendar } from "@/lib/calendar/queries";
import { NOTE_KINDS, POST_KINDS } from "@/lib/db/schema";
import { addDays, daysBetween, isClockTime, isIsoDay, isTimeZone, todayIn } from "@/lib/dates";
import { UserFacingError } from "@/lib/errors";
import { listNotes, saveNote } from "@/lib/notes/notes";
import { listPlaybooks, savePlaybook } from "@/lib/playbook/playbook";
import { playbookSchema } from "@/lib/playbook/schema";
import { planSlots, recordMetrics, recordPosts, saveDrafts } from "@/lib/posts/posts";
import { getProfile, updateProfile } from "@/lib/profile/profile";
import { reportError } from "@/lib/report-error";
import { decide, listDecisions, listReviews, saveReview } from "@/lib/reviews/reviews";
import { getStats } from "@/lib/stats/stats";
import { STAT_DIMENSIONS } from "@/lib/stats/summary";
import { parseXHandle } from "@/lib/x/x";
import { getBriefing, itemForClaude } from "./briefing";
import { ROUTINE_MODES } from "./routines";

/**
 * The MCP tools (docs/mcp.md). Every tool works on one user only: the one whose token came
 * with the request. Inputs are checked by these schemas before a tool runs; a problem Claude
 * can fix comes back as a one-sentence tool error.
 */

const day = z.string().refine(isIsoDay, "Use a date like 2026-10-30");
const clock = z.string().refine(isClockTime, "Use a 24-hour time like 12:30");
const dateTime = z
  .string()
  .refine(
    (v) => !Number.isNaN(Date.parse(v)),
    "Use an ISO date and time, eg 2026-10-30T12:34:00+01:00",
  );
const id = z.string().min(1).max(100);
const words = (max: number) => z.string().trim().min(1).max(max);
const count = z.number().int().min(0).max(100_000_000_000).nullable().optional();

const READ = { readOnlyHint: true, openWorldHint: false } as const;
const WRITE = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

function ok(data: unknown): CallToolResult {
  return { content: [{ type: "text", text: JSON.stringify(data) }] };
}

async function run(fn: () => Promise<unknown>): Promise<CallToolResult> {
  try {
    return ok(await fn());
  } catch (error) {
    if (error instanceof UserFacingError) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    reportError("MCP tool failed", error);
    return {
      content: [
        { type: "text", text: "Something went wrong on myloopland's side. Try again in a minute." },
      ],
      isError: true,
    };
  }
}

export function registerTools(server: McpServer, userId: string) {
  // The user's handle and time zone, read once per request.
  let profile: ReturnType<typeof getProfile> | undefined;
  const me = async () => {
    const row = await (profile ??= getProfile(userId));
    if (!row) throw new UserFacingError("This myloopland account no longer exists.");
    return row;
  };

  server.registerTool(
    "get_briefing",
    {
      title: "Get briefing",
      description:
        "Start here, every session. Returns the user's local date and time, profile, progress to the goal, the active playbook, today's slots with drafts and numbers, the next 7 days, recent posts, the last 28 days of results, unused notes, pending decisions, the last review, examples of the user's real voice, and the steps of the routine for `mode`.",
      inputSchema: z.object({
        mode: z
          .enum(ROUTINE_MODES)
          .default("chat")
          .describe(
            "setup (first time), daily (the scheduled morning run: numbers, the weekly review when due, drafts), morning (drafts only), evening (posts and numbers), weekly (review) or chat",
          ),
      }),
      annotations: READ,
    },
    ({ mode }) => run(() => getBriefing(userId, mode)),
  );

  server.registerTool(
    "get_calendar",
    {
      title: "Get calendar",
      description:
        "Days from `from` to `to` (up to 62 days): planned slots from the playbook, stored slots with drafts and questions, and posts with their newest numbers. Past days only show what was posted. A slot with post_id null exists only in the playbook so far.",
      inputSchema: z.object({ from: day, to: day }),
      annotations: READ,
    },
    ({ from, to }) =>
      run(async () => {
        if (to < from) throw new UserFacingError("`to` must be on or after `from`.");
        if (daysBetween(from, to) > 61)
          throw new UserFacingError("Ask for 62 days or fewer at a time.");
        const { timeZone } = await me();
        const { today, days } = await getCalendar(userId, timeZone, from, to);
        return {
          today,
          days: days.map((d) => ({ date: d.date, items: d.items.map(itemForClaude) })),
        };
      }),
  );

  server.registerTool(
    "get_stats",
    {
      title: "Get stats",
      description:
        "What worked: posted posts from `from` to `to` (default: the last 28 days) grouped by pillar, series, time (by the hour), weekday or kind, with median views, average likes, replies, reposts and bookmarks, and total profile visits and new follows. Unknown numbers are skipped, never counted as 0. Also how often drafts were posted and edited.",
      inputSchema: z.object({
        from: day.optional(),
        to: day.optional(),
        by: z.enum(STAT_DIMENSIONS).default("pillar"),
      }),
      annotations: READ,
    },
    ({ from, to, by }) =>
      run(async () => {
        const { timeZone } = await me();
        const today = todayIn(timeZone);
        return getStats(userId, timeZone, from ?? addDays(today, -28), to ?? today, by);
      }),
  );

  server.registerTool(
    "get_history",
    {
      title: "Get history",
      description:
        "Older records, newest first: playbook versions (with content), weekly reviews, decisions, or notes.",
      inputSchema: z.object({
        kind: z.enum(["playbook", "reviews", "decisions", "notes"]),
        limit: z.number().int().min(1).max(20).default(5),
      }),
      annotations: READ,
    },
    ({ kind, limit }) =>
      run(async () => {
        if (kind === "playbook") return listPlaybooks(userId, limit);
        if (kind === "reviews") return listReviews(userId, limit);
        if (kind === "decisions") return listDecisions(userId, { limit });
        return listNotes(userId, { limit });
      }),
  );

  server.registerTool(
    "update_profile",
    {
      title: "Update profile",
      description:
        "Changes the user's X profile (a handle or profile link) and/or time zone (IANA, eg Europe/Amsterdam). Slot times are in this time zone.",
      inputSchema: z.object({
        x_handle: z.string().max(200).optional(),
        time_zone: z
          .string()
          .refine(isTimeZone, "Use an IANA time zone, eg Europe/Amsterdam")
          .optional(),
      }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    ({ x_handle, time_zone }) =>
      run(async () => {
        const handle = x_handle === undefined ? undefined : parseXHandle(x_handle);
        if (handle === null) throw new UserFacingError("That isn't an X handle or profile link.");
        await updateProfile(userId, { xHandle: handle, timeZone: time_zone });
        profile = undefined;
        return { saved: true, profile: await me() };
      }),
  );

  server.registerTool(
    "update_playbook",
    {
      title: "Update playbook",
      description:
        "Saves a new version of the whole playbook (the old ones are kept). Send the full playbook, not only the changed part. Use it after the user agreed: in setup, or for approved decisions (pass their decision_ids, which marks them approved).",
      inputSchema: z.object({
        playbook: playbookSchema,
        summary: words(500).describe("What changed and why, in one or two sentences"),
        decision_ids: z.array(id).max(10).optional(),
      }),
      annotations: WRITE,
    },
    ({ playbook, summary, decision_ids }) =>
      run(async () => ({ version: await savePlaybook(userId, playbook, summary, decision_ids) })),
  );

  server.registerTool(
    "plan_slots",
    {
      title: "Plan slots",
      description:
        "Changes specific days of the plan without changing the playbook: set a topic, add a slot at a new time, skip a slot (status skipped), or ask the user something before drafting (a one-line question; status becomes needs_input). reset: true removes the change, so the slot follows the playbook again.",
      inputSchema: z.object({
        slots: z
          .array(
            z.object({
              date: day,
              time: clock,
              status: z.enum(["planned", "needs_input", "skipped"]).optional(),
              topic: words(200).optional(),
              pillar: z.string().max(40).nullable().optional(),
              series: z.string().max(80).nullable().optional(),
              question: z.string().max(300).nullable().optional(),
              reset: z.boolean().optional(),
            }),
          )
          .min(1)
          .max(50),
      }),
      annotations: WRITE,
    },
    ({ slots }) => run(async () => ({ slots: await planSlots(userId, slots) })),
  );

  server.registerTool(
    "save_drafts",
    {
      title: "Save drafts",
      description:
        "Saves the options for one slot (named by post_id, or date and time) and marks it Suggested. Each draft is ready-to-post text in the user's voice with a one-line reason; note_ids are the notes it was written from. By default it replaces the slot's earlier drafts; replace: false adds to them.",
      inputSchema: z.object({
        post_id: id.optional(),
        date: day.optional(),
        time: clock.optional(),
        drafts: z
          .array(
            z.object({
              text: words(4000),
              reason: z.string().max(300).optional(),
              note_ids: z.array(id).max(10).optional(),
            }),
          )
          .min(1)
          .max(10),
        replace: z.boolean().default(true),
      }),
      annotations: WRITE,
    },
    ({ post_id, date, time, drafts, replace }) =>
      run(() =>
        saveDrafts(
          userId,
          { postId: post_id, date, time },
          drafts.map((d) => ({ text: d.text, reason: d.reason, noteIds: d.note_ids })),
          replace,
        ),
      ),
  );

  server.registerTool(
    "record_posts",
    {
      title: "Record posts",
      description:
        "Records posts that really went out on X: the link, when (ISO with time zone), and the final text. Give the slot it was for (post_id, or date and time) and the draft_id it came from when known; otherwise a draft with the same text is matched. Posts outside the plan are stored as unplanned. Sending a post again updates it.",
      inputSchema: z.object({
        posts: z
          .array(
            z.object({
              x_url: z.string().url().max(500),
              posted_at: dateTime,
              text: z.string().max(25_000),
              kind: z.enum(POST_KINDS).optional(),
              post_id: id.optional(),
              date: day.optional(),
              time: clock.optional(),
              draft_id: id.optional(),
            }),
          )
          .min(1)
          .max(50),
      }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    ({ posts }) =>
      run(async () => {
        const { timeZone, xHandle } = await me();
        const results = await recordPosts(
          userId,
          timeZone,
          xHandle,
          posts.map((p) => ({
            xUrl: p.x_url,
            postedAt: p.posted_at,
            text: p.text,
            kind: p.kind,
            slot: { postId: p.post_id, date: p.date, time: p.time },
            draftId: p.draft_id,
          })),
        );
        return { posts: results };
      }),
  );

  server.registerTool(
    "record_metrics",
    {
      title: "Record numbers",
      description:
        "Saves one snapshot of numbers per post, as read on X now (views are X analytics' impressions), and optionally the account's follower count. Leave out numbers you couldn't see; never send 0 for unknown. Record the posts first with record_posts: unknown posts are listed back, not saved.",
      inputSchema: z.object({
        posts: z
          .array(
            z
              .object({
                x_url: z.string().url().max(500).optional(),
                post_id: id.optional(),
                views: count,
                likes: count,
                replies: count,
                reposts: count,
                bookmarks: count,
                shares: count,
                profile_visits: count,
                new_follows: count,
                extra: z
                  .record(z.string().max(40), z.union([z.number(), z.string().max(100)]))
                  .optional(),
              })
              .refine((p) => p.x_url || p.post_id, "Give x_url or post_id"),
          )
          .max(50)
          .default([]),
        account: z
          .object({
            followers: z.number().int().min(0),
            following: z.number().int().min(0).optional(),
            posts_count: z.number().int().min(0).optional(),
          })
          .optional(),
        captured_at: dateTime.optional(),
      }),
      annotations: WRITE,
    },
    ({ posts, account, captured_at }) =>
      run(() =>
        recordMetrics(
          userId,
          posts.map((p) => ({
            xUrl: p.x_url,
            postId: p.post_id,
            views: p.views,
            likes: p.likes,
            replies: p.replies,
            reposts: p.reposts,
            bookmarks: p.bookmarks,
            shares: p.shares,
            profileVisits: p.profile_visits,
            newFollows: p.new_follows,
            extra: p.extra,
          })),
          account && {
            followers: account.followers,
            following: account.following,
            postsCount: account.posts_count,
          },
          captured_at ? new Date(captured_at) : undefined,
        ),
      ),
  );

  server.registerTool(
    "save_note",
    {
      title: "Save note",
      description:
        "Keeps something the user told you, in their words: a dump of their day, a take (opinion), an idea, a fact, or feedback on drafts. Drafts may only use what is in notes, real events and public news. post_id links it to the slot it's about.",
      inputSchema: z.object({
        kind: z.enum(NOTE_KINDS),
        text: words(4000),
        post_id: id.optional(),
      }),
      annotations: WRITE,
    },
    ({ kind, text, post_id }) => run(() => saveNote(userId, { kind, text, postId: post_id })),
  );

  server.registerTool(
    "save_review",
    {
      title: "Save weekly review",
      description:
        "Saves the weekly review: a short summary, findings backed by numbers, and 1 to 3 suggested playbook changes, each with its reason. Each suggestion becomes a pending decision for the user to approve or skip.",
      inputSchema: z.object({
        period_start: day,
        period_end: day,
        summary: words(1000),
        findings: z.array(words(500)).max(10),
        suggestions: z.array(z.object({ change: words(300), reason: words(300) })).max(5),
      }),
      annotations: WRITE,
    },
    ({ period_start, period_end, summary, findings, suggestions }) =>
      run(() =>
        saveReview(userId, {
          periodStart: period_start,
          periodEnd: period_end,
          summary,
          findings,
          suggestions,
        }),
      ),
  );

  server.registerTool(
    "decide",
    {
      title: "Decide",
      description:
        "Records the user's answer to a pending decision. For an approved change that needs a new playbook, use update_playbook with decision_ids instead.",
      inputSchema: z.object({
        decision_id: id,
        status: z.enum(["approved", "skipped"]),
        note: z.string().max(500).optional(),
      }),
      annotations: { ...WRITE, idempotentHint: true },
    },
    ({ decision_id, status, note }) => run(() => decide(userId, decision_id, status, note)),
  );
}
