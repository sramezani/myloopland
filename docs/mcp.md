# Claude's side: the MCP connector

How a user's Claude connects to myloopland and what it can do there. Code: `src/app/mcp/route.ts`, `src/lib/mcp/` (tools, briefing, routines), `src/lib/auth/auth.ts`.

## Connecting (what the user does)

1. Sign in on myloopland and add the X profile.
2. In Claude (web, desktop or phone): Settings → Connectors → Add custom connector. Paste `<APP_URL>/mcp`, for example `https://myloopland.com/mcp`, and keep Claude's recommended sign-in settings ("Use Claude's published identity").
3. Click Connect. Claude opens myloopland: sign in with Google if needed, then **Allow** on the consent page.
4. In a new chat: "Set up my X growth plan with myloopland".

**Claude Code:** `claude mcp add --transport http myloopland <APP_URL>/mcp`, then `/mcp` (or `claude mcp login myloopland`) to sign in.

A connector added on claude.ai works in every Claude app (web, desktop, mobile), and in scheduled tasks. Claude's Free plan allows one custom connector.

## The OAuth flow (what happens)

All standard (MCP authorization spec, 2026-07-28 revision, with 2025 clients served too):

1. Claude sends `POST /mcp` without a token. The answer is `401` with `WWW-Authenticate: Bearer resource_metadata="<APP_URL>/.well-known/oauth-protected-resource/mcp"`.
2. That metadata names the resource (`<APP_URL>/mcp`) and the authorization server (`<APP_URL>/api/auth`). Its metadata is at `/.well-known/oauth-authorization-server/api/auth`, and advertises `client_id_metadata_document_supported: true` and the `none` token auth method.
3. Claude names itself with its Client ID Metadata Document, a URL on claude.ai that `@better-auth/cimd` fetches and checks. In development, open dynamic registration (`/api/auth/oauth2/register`) is also on, for MCP Inspector.
4. The browser opens `/api/auth/oauth2/authorize` with PKCE.
   - Without a session, it goes to `/signin?…`. The Google button carries the signed OAuth query along (`oauthProviderClient()`), so the flow continues after Google.
   - Then it goes to `/consent?…`, where Allow calls `oauth2/consent`.
5. Claude exchanges the code at `/api/auth/oauth2/token`. It gets a 1-hour JWT access token bound to `<APP_URL>/mcp`, and a refresh token that lasts 90 days and rotates (with a 30-second grace for retries).
6. Each `POST /mcp` request goes through `requireMcpAuth`, which checks the signature against `/api/auth/jwks`, the issuer, the audience and the expiry, with no database round trip. The token's `sub` is the user, and every tool works on that user only.

The MCP transport is stateless (`createMcpHandler`, a fresh server per request). Only `POST` is served; `GET` answers 405. The SDK's default `legacy: "stateless"` keeps 2025-protocol clients working.

## Tools

Inputs are Zod-checked (texts up to 2,000 to 4,000 characters, lists up to 50 items, calendar ranges up to 62 days). Results are JSON text. A problem Claude can fix comes back as a one-sentence tool error. A slot is named by `post_id`, or by `date` + `time` (local, "HH:MM").

| Tool | What it does |
| --- | --- |
| `get_briefing(mode)` | Start here. Local date and time, profile, progress (followers, 7/30-day change, goal, follows needed a week), the active playbook, today's slots with drafts and numbers, the next 7 days, recent posts, the last 28 days of results (by pillar and time, best and worst, draft use), unused notes, pending decisions, the last review, voice examples (recent posts and draft → posted edits), and the routine's steps |
| `get_calendar(from, to)` | Days with planned slots, stored slots, drafts and posts with their newest numbers |
| `get_stats(from?, to?, by)` | What worked, grouped by pillar, series, time, weekday or kind (default: last 28 days, by pillar) |
| `get_history(kind, limit)` | Older playbook versions, reviews, decisions or notes |
| `update_profile(x_handle?, time_zone?)` | Changes the X profile or time zone |
| `update_playbook(playbook, summary, decision_ids?)` | Saves a new version (the whole playbook); marks those decisions approved |
| `plan_slots(slots[])` | Changes days: topic, new slot, skip, a question for the user (`needs_input`), or `reset` back to the playbook |
| `save_drafts(slot, drafts[], replace?)` | The options for a slot, each with a one-line reason and the notes it used |
| `record_posts(posts[])` | What was posted: link, time, final text, slot and draft. Unplanned posts too; the same post again is an update |
| `record_metrics(posts[], account?, captured_at?)` | One snapshot of numbers per post, and the follower count. Unknown posts are listed back |
| `save_note(kind, text, post_id?)` | Something the user said: dump, take, idea, fact or feedback |
| `save_review(period, summary, findings[], suggestions[])` | The weekly review; each suggestion becomes a pending decision |
| `decide(decision_id, status, note?)` | The user's answer to a suggestion |

## Routines

The steps live in `src/lib/mcp/routines.ts` and go out three ways: in the server `instructions` (short), as MCP prompts (`setup`, `daily`, `morning`, `evening`, `weekly`; Claude Code shows them as `/myloopland:daily`), and inside `get_briefing(mode)`. So any Claude app follows them without a skill, and an improvement ships with the next deploy. The daily routine is built from the same step lists as the morning, evening and weekly ones, so they can't drift apart.

- **setup:**
  1. If Claude can browse, it reads the bio and follower count at the top of the profile (no scrolling).
  2. It reads the user's own posts of the last 4 weeks on the analytics Content page (`type=posts`, then `type=community`, `days=28`) and saves them with their numbers, so the first weekly review has data. Nothing is downloaded or exported. Without the analytics page (it may need X Premium), it reads about 20 posts on the profile instead.
  3. It asks at most 5 questions, then proposes and saves the playbook and records followers.
  4. It offers the one scheduled task (the daily routine), and tells the user where the plan is and how to change it.
- **daily (the scheduled one):** one run each morning, in three parts.
  1. **Numbers** (needs a browser signed in to X): reads `https://x.com/i/account_analytics/content?type=posts&sort=date&dir=desc&days=7`, then `type=community`, records new posts and one snapshot for every row, plus followers. Without a browser it skips this part and says so.
  2. **Weekly review**, only when `last_review` is null or its period ended 7 or more days ago, and there are posts. It asks about the suggestions in its reply instead of waiting.
  3. **Today's drafts**, as in the morning routine.
- **morning:** drafts for today's slots from notes, real events and the last 24 hours of news, each with a reason from past numbers. Asks instead of guessing. A "Claude's pick" topic is chosen first; drafts written ahead are left as they are.
- **evening (needs a browser signed in to X):** the daily routine's numbers part for today, then skips today's unposted slots. Never downloads. If the analytics page isn't available, it falls back to the profile or a screenshot.
- **weekly:** `get_stats` for 4 weeks, 1 to 3 changes backed by numbers, `save_review`, asks the user, then `update_playbook` or `decide`. If the playbook's rules ask for drafts ahead, it then writes the next 7 days' drafts, except news and takes.
- **chat:** short commands such as "take 2: overhyped", "posted option 2" or "approve 1, skip 2", plus plan changes in plain words: "change my plan: one post a day at 09:00", "you pick each day's topic" (topics become "Claude's pick") and "write my week ahead" (a playbook rule; the user schedules the drafts on X themselves).

Voice: the user's own writing skill if they have one (Sia: `x-posts`), otherwise `playbook.voice`, learning from how they edit drafts.

**The scheduled task** (set up in the user's Claude; setup offers it and `/dashboard/plan` shows it): "Run my myloopland daily routine", every morning around 07:30, before the first slot. It reads numbers, so it runs on the user's computer, which must be awake with a browser signed in to X; without one it still writes the drafts. Today's posts get their numbers the next morning. Anyone who wants them split can schedule the morning, evening and weekly routines instead.

## Testing

- **Discovery:** `curl -i -X POST http://localhost:3000/mcp` gives a 401 with the `WWW-Authenticate` header. `curl http://localhost:3000/.well-known/oauth-protected-resource/mcp` and `curl http://localhost:3000/.well-known/oauth-authorization-server/api/auth` give the metadata.
- **Tools without OAuth:** `src/lib/mcp/mcp.db.test.ts` drives the real handler (initialize, tools, prompts) against Postgres when `TEST_DATABASE_URL` is set.
- **MCP Inspector (development):** `npx @modelcontextprotocol/inspector`, then connect to `http://localhost:3000/mcp` with OAuth. It registers itself, because dynamic registration is on in development.
- **Claude Code:** add the local server as above and say "Run my myloopland daily routine".
- **claude.ai** needs a public HTTPS address, so it waits for the deploy (or a temporary tunnel whose address is also `APP_URL` and a Google redirect URI).

## Things to know

- Claude connects from Anthropic's cloud (IPv4, `160.79.104.0/21`). Cloudflare's WAF and bot rules must skip `/mcp`, `/api/auth/*` and `/.well-known/*` (`docs/deploy.md`).
- Cloudflare cuts requests at 125 seconds and Claude waits up to 240 seconds. The tools are quick database calls.
- Tool results are capped at about 150,000 characters on claude.ai and 25,000 tokens in Claude Code: `get_briefing` stays compact, and lists are paged by date.
- The X handle isn't verified (there is no X login). Each user's data is private to them, so that's harmless.
