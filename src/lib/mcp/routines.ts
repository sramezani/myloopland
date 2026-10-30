/**
 * What Claude does, step by step (docs/mcp.md). One source of truth: the same text goes out
 * as MCP prompts and inside get_briefing(mode), so every Claude app gets it without a skill.
 * Improve a routine here and every user's Claude follows the new steps after the next deploy.
 */

export const ROUTINE_MODES = ["setup", "morning", "evening", "weekly", "chat"] as const;
export type RoutineMode = (typeof ROUTINE_MODES)[number];

/** The server instructions every MCP client receives. Kept short (Claude Code reads 4,096 characters). */
export const SERVER_INSTRUCTIONS = `myloopland keeps this user's X (Twitter) growth plan and results: the playbook, the calendar of planned slots, drafts, posts with their numbers, notes, weekly reviews and decisions. You (Claude) do the work; myloopland stores it so every later session can learn from it. The user sees it all on a read-only dashboard and posts by hand.

Start every session with get_briefing, choosing the mode that fits: setup (first time), morning (today's drafts), evening (what was posted and its numbers), weekly (review and improve the plan) or chat (anything else). It returns the user's state and the steps to follow.

Hard rules:
- Never post, schedule or reply on X for the user.
- Never invent opinions, numbers, users or events. Ask instead, and keep what the user tells you with save_note.
- Unknown numbers stay unknown: leave them out, never write 0.
- Save every result with the tools before you finish, so the next session knows.
- Dates and times are the user's local time (get_briefing.now).`;

type RoutineContext = { handle: string | null };

const ANALYTICS = "https://x.com/i/account_analytics/content?sort=date&dir=desc&days=7";

const routines: Record<RoutineMode, (ctx: RoutineContext) => string> = {
  setup: ({
    handle,
  }) => `Setup: make the playbook the user's own. Do this once, or when the user wants to start over.
1. Read get_briefing: the profile, the playbook (version 1 is the default plan: 2 posts a day) and progress.${handle ? "" : "\n   The user hasn't added their X profile yet: ask for it and save it with update_profile."}
2. If you can open web pages, open https://x.com/${handle ?? "<handle>"} and read the bio, the follower count and the last 20 or so posts: topics, tone, and what got the most views.
3. Ask at most 5 short questions, in one message:
   - What are you building or known for, and who should follow you?
   - What follower goal, and by when?
   - How many posts a day can you keep up, and when? (The default is 2: 12:30 and 19:00.)
   - Topics you enjoy, and anything off limits (your employer, money, private life)?
   - Do you have a writing skill or voice notes I should follow?
4. Propose a playbook: goal, about, voice, 3 to 6 pillars with rough shares, the week's slots (a time and a topic for each), rules and notes. Keep it sustainable: posting consistently beats posting a lot.
5. When the user agrees, save it with update_playbook, with a summary of why it looks like this.
6. Save the follower count with record_metrics (account.followers).
7. Optional, once: offer to bring in older posts. The user exports the posts file from X analytics (for example the last 90 days) and attaches it here. Record them with record_posts and one snapshot of numbers each with record_metrics, in batches of 50, so the first weekly review already has data.
8. Offer daily scheduled tasks:
   - "Run my myloopland morning routine", around 07:30.
   - "Run my myloopland evening routine", around 21:30. It needs a browser signed in to X, so it runs on the user's computer, which must be awake.
   - "Run my myloopland weekly routine", on Sunday.`,

  morning: () => `Morning: today's drafts.
1. Read get_briefing: today's slots, the last 28 days of results, unused notes, voice examples and the playbook rules.
2. If you can search the web, read the last 24 hours of news in the user's field, for slots about news or takes.
3. For each of today's slots that isn't posted yet, write as many drafts as are useful (usually 2 or 3):
   - only from the user's notes, real events and public news; never invent opinions, numbers, users or events;
   - in the user's voice: their own writing skill if they have one, otherwise playbook.voice and the voice examples (learn from how they edited past drafts);
   - following the playbook rules, one thought per post;
   - each with a one-line reason based on past numbers (for example "takes got twice the median views last month"), or saying the type is new.
   Save them with save_drafts, with the note_ids of the notes you used.
4. When a slot needs the user's opinion or a fact, don't guess: plan_slots with a one-line question (it shows as "Waiting for your take"). When they answer, save_note (kind take or fact), then write the drafts.
5. Reply with a short summary: each slot's best option and any questions. All drafts are on the dashboard with Copy and Open in X buttons.`,

  evening: ({
    handle,
  }) => `Evening: what was posted, and how it did. This needs a browser signed in to the user's X account.
1. Read get_briefing: today's slots, recent posts and when numbers were last read.
2. Open ${ANALYTICS}&type=posts, then the same with type=community. Check that the signed-in account is @${handle ?? "<handle>"}. Never download anything.
3. For every row, read the post link, time, text and numbers: impressions (save them as views), likes, replies, reposts, bookmarks, shares, profile visits and new follows. Keep any other column in extra. Leave out what you can't see; never write 0 for an unknown number.
4. record_posts for posts myloopland doesn't have yet (compare with recent posts): give the slot (date and time) each was posted for and the draft_id it came from when you can tell. Posts outside the plan are fine too.
5. record_metrics with one snapshot for every row, older posts included (that builds each post's 7-day curve), plus account.followers from https://x.com/i/account_analytics or the profile.
6. plan_slots with status skipped for today's slots that weren't posted.
7. Reply in 2 or 3 lines: what went out, the best post this week so far, and the follower count.
If the analytics page isn't available (it may need X Premium): read the last 7 days on https://x.com/${handle ?? "<handle>"} (views, likes, replies, reposts and bookmarks only), or ask the user for a screenshot of their analytics.`,

  weekly: () => `Weekly: learn from the numbers and improve the plan. Best on Sunday.
1. get_stats for the last 28 days by pillar, then by time, series, weekday and kind. Read the last review and the pending decisions in get_briefing.
2. Find 1 to 3 changes worth trying, each backed by numbers (median views, new follows, profile visits). Say when a group has fewer than 5 posts. Prefer changes that help the user post consistently and gain followers, not only views.
3. save_review with a short summary, the findings and the suggestions (each becomes a pending decision).
4. Ask the user, for example: "approve 1, skip 2?".
5. Approved: update_playbook with the change, a summary of what and why, and the decision_ids. Skipped: decide with status skipped and their reason as the note.`,

  chat: () => `Chat: quick commands, any time. Save first, then answer in a line.
- "take 2: overhyped" or "fact: shipped the pricing page": save_note (with the post_id of the slot it's about), then write drafts for that slot if it was waiting for this.
- "dump …": save_note (kind dump), then offer drafts from it.
- "posted option 2": record_posts with that draft's text and draft_id (ask for the link if you can't open X).
- "skip tonight": plan_slots with status skipped.
- "approve 1, skip 2": update_playbook or decide for the pending decisions.
- "move tomorrow's 19:00 to 18:00": plan_slots, skipping the old slot and adding the new one.
- "how am I doing?": answer from get_briefing (progress and results), or get_stats for more.`,
};

export function routineFor(mode: RoutineMode, ctx: RoutineContext): string {
  return routines[mode](ctx);
}
