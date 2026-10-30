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

The steps live in `src/lib/mcp/routines.ts` and go out three ways: in the server `instructions` (short), as MCP prompts (`setup`, `morning`, `evening`, `weekly`; Claude Code shows them as `/myloopland:morning`), and inside `get_briefing(mode)`. So any Claude app follows them without a skill, and an improvement ships with the next deploy.

- **setup:** reads the X profile if Claude can browse, asks at most 5 questions, proposes and saves the playbook, records followers, offers a one-time import of older posts (an export the user attaches) and the scheduled tasks.
- **morning:** drafts for today's slots from notes, real events and the last 24 hours of news, each with a reason from past numbers. Asks instead of guessing.
- **evening (needs a browser signed in to X):**
  1. Reads `https://x.com/i/account_analytics/content?sort=date&dir=desc&days=7&type=posts`, then the same with `type=community`.
  2. Records new posts and one snapshot for every row, plus followers.
  3. Skips unposted slots.
  4. Never downloads. If the page isn't available (it may need X Premium), it falls back to the profile or a screenshot.
- **weekly:** `get_stats` for 4 weeks, 1 to 3 changes backed by numbers, `save_review`, asks the user, then `update_playbook` or `decide`.
- **chat:** short commands such as "take 2: overhyped", "posted option 2" or "approve 1, skip 2".

Voice: the user's own writing skill if they have one (Sia: `x-posts`), otherwise `playbook.voice`, learning from how they edit drafts.

**Scheduled tasks** (set up in the user's Claude):
- "Run my myloopland morning routine", around 07:30. It can run in the cloud.
- "Run my myloopland evening routine", around 21:30. It runs on the user's computer, which must be awake with a browser signed in to X.
- "Run my myloopland weekly routine", on Sunday.

## Testing

- **Discovery:** `curl -i -X POST http://localhost:3000/mcp` gives a 401 with the `WWW-Authenticate` header. `curl http://localhost:3000/.well-known/oauth-protected-resource/mcp` and `curl http://localhost:3000/.well-known/oauth-authorization-server/api/auth` give the metadata.
- **Tools without OAuth:** `src/lib/mcp/mcp.db.test.ts` drives the real handler (initialize, tools, prompts) against Postgres when `TEST_DATABASE_URL` is set.
- **MCP Inspector (development):** `npx @modelcontextprotocol/inspector`, then connect to `http://localhost:3000/mcp` with OAuth. It registers itself, because dynamic registration is on in development.
- **Claude Code:** add the local server as above and say "Run my myloopland morning routine".
- **claude.ai** needs a public HTTPS address, so it waits for the deploy (or a temporary tunnel whose address is also `APP_URL` and a Google redirect URI).

## Things to know

- Claude connects from Anthropic's cloud (IPv4, `160.79.104.0/21`). Cloudflare's WAF and bot rules must skip `/mcp`, `/api/auth/*` and `/.well-known/*` (`docs/deploy.md`).
- Cloudflare cuts requests at 125 seconds and Claude waits up to 240 seconds. The tools are quick database calls.
- Tool results are capped at about 150,000 characters on claude.ai and 25,000 tokens in Claude Code: `get_briefing` stays compact, and lists are paged by date.
- The X handle isn't verified (there is no X login). Each user's data is private to them, so that's harmless.
