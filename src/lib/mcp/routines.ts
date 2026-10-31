/**
 * What Claude does, step by step (docs/mcp.md). One source of truth: the same text goes out
 * as MCP prompts and inside get_briefing(mode), so every Claude app gets it without a skill.
 * Improve a routine here and every user's Claude follows the new steps after the next deploy.
 */

export const ROUTINE_MODES = ["setup", "daily", "morning", "evening", "weekly", "chat"] as const;
export type RoutineMode = (typeof ROUTINE_MODES)[number];

/** The server instructions every MCP client receives. Kept short (Claude Code reads 4,096 characters). */
export const SERVER_INSTRUCTIONS = `myloopland keeps this user's X (Twitter) growth plan and results: the playbook, the calendar of planned slots, drafts, posts with their numbers, notes, weekly reviews and decisions. You (Claude) do the work; myloopland stores it so every later session can learn from it. The user sees it all on a read-only dashboard and posts by hand.

Start every session with get_briefing, choosing the mode that fits: setup (first time), daily (the one scheduled run each morning: yesterday's numbers, the weekly review when it's due, today's drafts), morning (today's drafts only), evening (what was posted and its numbers), weekly (review and improve the plan) or chat (anything else). It returns the user's state and the steps to follow.

Hard rules:
- Never post, schedule or reply on X for the user.
- Never invent opinions, numbers, users or events. Ask instead, and keep what the user tells you with save_note.
- Unknown numbers stay unknown: leave them out, never write 0.
- Save every result with the tools before you finish, so the next session knows.
- Dates and times are the user's local time (get_briefing.now).`;

type RoutineContext = { handle: string | null };

/** X's analytics Content page: only the user's own posts, newest first, with their numbers. */
function analyticsUrl(type: "posts" | "community", days: number): string {
  return `https://x.com/i/account_analytics/content?type=${type}&sort=date&dir=desc&days=${days}`;
}

/** Joins headings (strings) and step lists (arrays), numbering the steps 1, 2, 3… across lists. */
function outline(...parts: (string | string[])[]): string {
  let n = 0;
  return parts
    .map((part) =>
      typeof part === "string" ? part : part.map((step) => `${++n}. ${step}`).join("\n"),
    )
    .join("\n");
}

// The parts the routines share, so the daily routine and the single ones never drift apart.

const numberSteps = (handle: string | null) => [
  `Open ${analyticsUrl("posts", 7)}, then ${analyticsUrl("community", 7)}. Check that the signed-in account is @${handle ?? "<handle>"}. Never download anything.`,
  "For every row, read the post link, time, text and numbers: impressions (save them as views), likes, replies, reposts, bookmarks, shares, profile visits and new follows. Keep any other column in extra. Leave out what you can't see; never write 0 for an unknown number.",
  "record_posts for posts myloopland doesn't have yet (compare with recent posts): give the slot (date and time) each was posted for and the draft_id it came from when you can tell. Posts outside the plan are fine too.",
  "record_metrics with one snapshot for every row, older posts included (that builds each post's 7-day curve), plus account.followers from https://x.com/i/account_analytics or the profile.",
];

const numbersFallback = (handle: string | null) =>
  `If the analytics page isn't available (it may need X Premium): read the last 7 days on https://x.com/${handle ?? "<handle>"} (views, likes, replies, reposts and bookmarks only), or ask the user for a screenshot of their analytics.`;

const reviewSteps = [
  "get_stats for the last 28 days by pillar, then by time, series, weekday and kind. Read the last review and the pending decisions in get_briefing.",
  "Find 1 to 3 changes worth trying, each backed by numbers (median views, new follows, profile visits). Say when a group has fewer than 5 posts. Prefer changes that help the user post consistently and gain followers, not only views.",
  "save_review with a short summary, the findings and the suggestions (each becomes a pending decision).",
  `Ask the user, for example: "approve 1, skip 2?".`,
  "Approved: update_playbook with the change, a summary of what and why, and the decision_ids. Skipped: decide with status skipped and their reason as the note.",
  "If the playbook's rules say to write drafts ahead, write them now for the next 7 days' slots with save_drafts, skipping slots that already have drafts. Leave out slots about news or takes, or that need the user's opinion: those still get drafts on the day.",
];

const draftSteps = [
  "If you can search the web, read the last 24 hours of news in the user's field, for slots about news or takes.",
  `When a slot's topic is "Claude's pick", choose one from the news, the user's notes and what worked (keeping to its pillar), and set it with plan_slots before drafting.`,
  `For each of today's slots that isn't posted yet and has no drafts yet (drafts written ahead stay as they are), write as many drafts as are useful (usually 2 or 3):
   - only from the user's notes, real events and public news; never invent opinions, numbers, users or events;
   - in the user's voice: their own writing skill if they have one, otherwise playbook.voice and the voice examples (learn from how they edited past drafts);
   - following the playbook rules, one thought per post;
   - each with a one-line reason based on past numbers (for example "takes got twice the median views last month"), or saying the type is new.
   Save them with save_drafts, with the note_ids of the notes you used.`,
  `When a slot needs the user's opinion or a fact, don't guess: plan_slots with a one-line question (it shows as "Waiting for your take"). When they answer, save_note (kind take or fact), then write the drafts.`,
];

const routines: Record<RoutineMode, (ctx: RoutineContext) => string> = {
  setup: ({ handle }) =>
    outline(
      "Setup: make the playbook the user's own. Do this once, or when the user wants to start over.",
      [
        `Read get_briefing: the profile, the playbook (version 1 is the default plan: 2 posts a day) and progress.${handle ? "" : "\n   The user hasn't added their X profile yet: ask for it and save it with update_profile."}`,
        `If you can open web pages in a browser signed in to X:
   - Read the bio and the follower count at the top of https://x.com/${handle ?? "<handle>"}. Don't scroll through the profile.
   - Open ${analyticsUrl("posts", 28)}, then ${analyticsUrl("community", 28)}, and check that the signed-in account is @${handle ?? "<handle>"}. These are the user's own posts of the last 4 weeks with their numbers: learn the topics, the tone, and what got the most views and new follows. Never download anything.
   - Save them now, so the first weekly review has data: record_posts (no slot: they're older than the plan), then record_metrics with one snapshot each (impressions are views; leave out numbers you can't see), in batches of 50.
   If the analytics page isn't available (it may need X Premium), read about 20 of the newest posts on the profile instead.`,
        `Ask at most 5 short questions, in one message:
   - What are you building or known for, and who should follow you?
   - What follower goal, and by when?
   - How many posts a day can you keep up, and when? (The default is 2: 12:30 and 19:00.)
   - Topics you enjoy, and anything off limits (your employer, money, private life)?
   - Do you have a writing skill or voice notes I should follow?`,
        "Propose a playbook: goal, about, voice, 3 to 6 pillars with rough shares, the week's slots (a time and a topic for each), rules and notes. Keep it sustainable: posting consistently beats posting a lot.",
        "When the user agrees, save it with update_playbook, with a summary of why it looks like this.",
        "Save the follower count with record_metrics (account.followers).",
        `Offer one scheduled task: "Run my myloopland daily routine", every morning around 07:30 (before the first slot). Each run reads yesterday's numbers, does the weekly review once a week, and writes today's drafts. Reading numbers needs a browser signed in to X, so it runs on the user's computer, which must be awake; without one it still writes the drafts. If the user prefers, split it into the morning, evening and weekly routines instead.`,
        `Tell the user the plan is on the dashboard (menu → Your plan), and that they change it by telling you, for example "one post a day at 09:00", "you pick each day's topic", or "write my week ahead" to schedule a week of posts on X themselves.`,
      ],
    ),

  daily: ({ handle }) =>
    outline(
      "Daily: the one scheduled run, each morning. Do the parts in order, and save each one before starting the next.",
      [
        "Read get_briefing: today's slots, recent posts, the last review, pending decisions, unused notes, voice examples and the playbook.",
      ],
      "Numbers. This needs a browser signed in to the user's X account; without one, go on to the review and say so in your reply.",
      numberSteps(handle),
      "Weekly review, only when last_review is null or its period ended 7 or more days ago, and results_28_days has posts. Don't wait for the user's answer: ask in your reply at the end.",
      reviewSteps,
      "Today's drafts.",
      draftSteps,
      [
        "Reply in a few lines: yesterday's posts and the follower count, the review's suggestions to approve or skip (if one ran), and each of today's slots with its best option and any questions. All drafts are on the dashboard with Copy and Open in X buttons.",
      ],
      numbersFallback(handle),
    ),

  morning: () =>
    outline("Morning: today's drafts only. The daily routine does this too, after the numbers.", [
      "Read get_briefing: today's slots, the last 28 days of results, unused notes, voice examples and the playbook rules.",
      ...draftSteps,
      "Reply with a short summary: each slot's best option and any questions. All drafts are on the dashboard with Copy and Open in X buttons.",
    ]),

  evening: ({ handle }) =>
    outline(
      "Evening: what was posted, and how it did. This needs a browser signed in to the user's X account.",
      [
        "Read get_briefing: today's slots, recent posts and when numbers were last read.",
        ...numberSteps(handle),
        "plan_slots with status skipped for today's slots that weren't posted.",
        "Reply in 2 or 3 lines: what went out, the best post this week so far, and the follower count.",
      ],
      numbersFallback(handle),
    ),

  weekly: () =>
    outline(
      "Weekly: learn from the numbers and improve the plan. Best on Sunday; the daily routine does it once a week by itself.",
      reviewSteps,
    ),

  chat: () => `Chat: quick commands, any time. Save first, then answer in a line.
- "take 2: overhyped" or "fact: shipped the pricing page": save_note (with the post_id of the slot it's about), then write drafts for that slot if it was waiting for this.
- "dump …": save_note (kind dump), then offer drafts from it.
- "posted option 2": record_posts with that draft's text and draft_id (ask for the link if you can't open X).
- "skip tonight": plan_slots with status skipped.
- "approve 1, skip 2": update_playbook or decide for the pending decisions.
- "move tomorrow's 19:00 to 18:00": plan_slots, skipping the old slot and adding the new one.
- "change my plan: one post a day at 09:00" (or any other change to the times, topics, pillars, rules, voice or goal): update_playbook with the whole playbook, changing only that, and a one-line summary of what and why. Ask first if the change is unclear.
- "you pick each day's topic": update_playbook, keeping the times and pillars and setting each topic to "Claude's pick". The drafts step then chooses it each day.
- "write my week ahead": update_playbook, replacing the rule about writing drafts on the day with "Write the next 7 days' drafts after each weekly review, so I can schedule them on X myself. News and takes are still written on the day." Then write them now for the next 7 days' slots, leaving out news and takes. Never schedule anything on X yourself.
- "how am I doing?": answer from get_briefing (progress and results), or get_stats for more.`,
};

export function routineFor(mode: RoutineMode, ctx: RoutineContext): string {
  return routines[mode](ctx);
}
