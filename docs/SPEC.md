# myloopland: technical spec

How myloopland is built. The "what and why" is `docs/BRIEF.md`; Claude's side (connecting, tools, routines) is `docs/mcp.md`; the server is `docs/deploy.md`. Update this file before building something differently, and log why in `docs/DECISIONS.md`.

## 1. In one paragraph

A Next.js app with Google sign-in and one input (the X profile). It serves a read-only calendar and an MCP endpoint at `/mcp`. The user's Claude connects to `/mcp` through OAuth (the same Google sign-in), then plans, drafts, records posts and numbers, and reviews the week through 13 tools. Postgres keeps everything. One server, Docker Compose, Caddy, Cloudflare.

## 2. Architecture

```
The user's Claude (claude.ai / desktop / mobile / Claude Code)
   │ MCP over Streamable HTTP + OAuth token          x.com in the user's browser
   ▼                                                  ▲ Claude reads posts and numbers there
myloopland: Next.js, one container
   ├─ /mcp                  MCP tools + prompts; token → user, every query scoped to that user
   ├─ /api/auth/*           Better Auth: Google sign-in + the OAuth server for Claude
   ├─ /.well-known/*        OAuth discovery for MCP clients
   ├─ /consent              the user allows Claude to connect
   ├─ /dashboard            read-only calendar (server components)
   ├─ /dashboard/plan       the active playbook, read-only
   └─ src/lib/*             one data layer, used by both MCP tools and pages
   ▼
Postgres 17 container ── nightly backup to Cloudflare R2 (optional)
```

- **Writes** come only from Claude, through the MCP tools, plus the X profile form and "Delete account".
- **The server never calls X.** Claude reads X in the user's own browser and sends the numbers.
- **No jobs** run on the server except the nightly backup and cleanup. Claude's routines are scheduled in each user's own Claude.

## 3. Code layout and layers

| Folder | What lives there |
| --- | --- |
| `src/config/theme.ts` | Colours, radius, shadows, brand facts (plain data) |
| `src/components/ui` | shadcn parts |
| `src/components/shared` | Reusable blocks that take props and fetch nothing: `CardShell`, `CopyButton`, `Copyable`, `StatusBadge`, `Metric`, `SegmentedLinks`, `RangeNav`, `Notice`, `EmptyState`, `Logo`, `GoogleButton`, `Container` |
| `src/components/{account,calendar,onboarding,plan}` | Feature components |
| `src/lib` | Data access and helpers: `db`, `auth`, `playbook`, `calendar`, `posts`, `notes`, `reviews`, `stats`, `progress`, `profile`, `account`, `mcp`, `x`, `dates`, `format` |
| `src/app` | Routes, pages and server actions |

Layers: `src/config` → `components/ui` → `components/shared` → feature folders → `src/app`. Each imports only from its own folder and the layers before; `src/lib` imports only `config` and `lib`. ESLint enforces it, and bans relative `../` imports. All formatting of numbers and days goes through `src/lib/format.ts`.

## 4. Data model

One file, `src/lib/db/schema.ts`. Singular table names; camelCase keys with snake_case columns; text ids (`crypto.randomUUID()`, `src/lib/ids.ts`); `timestamptz` everywhere; every `user_id` cascades on delete, so deleting a user deletes all their data.

| Table | Holds |
| --- | --- |
| `user`, `session`, `account`, `verification` | Better Auth. `user` also has `x_handle` and `time_zone` (`additionalFields`, never set by sign-up) |
| `oauth_client`, `oauth_access_token`, `oauth_refresh_token`, `oauth_consent`, `oauth_client_assertion`, `oauth_resource`, `oauth_client_resource`, `jwks` | Claude's connections (generated for `@better-auth/mcp`, `jwt` and `cimd`) |
| `playbook` | One row per version: `version`, `content` (jsonb, section 5), `summary`. Unique (user_id, version); the newest is active |
| `post` | A slot something happened to (custom topic, question, drafts, skip) or a post that went out. `date` and `slot_time` are local; `slot_time` is null for an unplanned post. `status`: planned, needs_input, drafted, posted, skipped. `kind`: post, quote, thread, community. Unique (user_id, date, slot_time) and (user_id, x_post_id); nulls never clash |
| `draft` | Claude's options for a post: `position`, `text`, `reason`, `picked`, `note_ids` |
| `post_metric` | One snapshot per reading: views (X's impressions), likes, replies, reposts, bookmarks, shares, profile visits, new follows, `extra`. All nullable |
| `account_stat` | Followers (and following, posts) over time |
| `note` | What the user told Claude: dump, take, idea, fact, feedback; `used_at` once a draft used it |
| `review` | A weekly review: period, summary, findings |
| `decision` | A suggested playbook change: pending, approved (with the playbook version) or skipped |

Migrations live in `drizzle/` and run when the container starts (`scripts/migrate.mjs`).

## 5. Playbook and stats

**Playbook** (`src/lib/playbook/schema.ts`, Zod): `goal` (followers and a date, or null), `about`, `voice`, `pillars` (key, label, rough share), `week` (for each weekday, zero or more slots of time + topic + optional pillar and series), `rules`, `notes`. Times are "HH:MM", unique per day, sorted on save.

**Default, v1** (`src/lib/playbook/default.ts`), saved when the X profile is first set: 2 slots every day (12:30 and 19:00) with a weekly topic each, 5 generic pillars, 6 rules (never invent, drafts on the day, one thought per post, at most one quote a day, respect off-limits topics, never post for the user). The setup routine makes it the user's own.

**Seeing and changing it:** `/dashboard/plan` shows the active version read-only: why it last changed, goal, about, voice, the week's slots, pillars, rules and notes, and lines to say to Claude. Only Claude changes it (`update_playbook`), when the user asks in plain words. Two options need no schema change:

- **"Claude's pick"** as a slot's topic: Claude chooses that day's topic from the news, the user's notes and what worked, keeping to the slot's pillar.
- **Writing ahead:** a rule asking for drafts ahead makes the weekly review write the next 7 days' drafts, except news and takes, which are still written on the day. The user may schedule them on X themselves; myloopland and Claude never do.

**What worked** (`src/lib/stats/summary.ts`, pure): posted posts grouped by pillar, series, time (by the hour), weekday or kind, with the median of views, averages of likes, replies, reposts and bookmarks, and totals of profile visits and new follows. Each uses the post's newest snapshot and skips unknown numbers. Also how often drafts were posted and edited, and the follower change over 7 and 30 days.

## 6. Calendar

**Views** (`src/lib/calendar/range.ts`): `day`; `week` (Monday to Sunday); `month`, shown as "30 days": 5 weeks from the Monday of the week before the anchor, so about 10 past days and 24 coming days. Previous and next move one day, one week, or 4 weeks. The address holds the state: `/dashboard?view=week&date=2026-10-30`.

**Days** (`src/lib/calendar/days.ts`, pure):
- Past days show only what was posted.
- Today and later show the playbook's slots (worked out on read, `src/lib/playbook/plan.ts`) merged with stored rows by (date, slot_time). A stored row wins, a skipped row hides its slot, and stored rows outside the playbook (custom slots, unplanned posts) are added. Items sort by time.
- Nothing rolls the plan forward and nothing needs a job: a playbook change shows at once.

`getCalendar()` (`src/lib/calendar/queries.ts`) loads the rows with their drafts and newest numbers, and is shared by the dashboard and the `get_calendar` tool.

## 7. Auth and Claude's connection

- **People** sign in with Google (Better Auth, basic scopes only), through the browser client in `src/lib/auth/client.ts`. Sessions last 30 days. `src/proxy.ts` makes an optimistic cookie check; every page and action still calls `requireUser()`.
- **Claude** connects with OAuth 2.1 (`@better-auth/mcp`):
  - Claude is identified by its Client ID Metadata Document (`@better-auth/cimd`). Open dynamic registration is on only in development, for MCP Inspector.
  - Access tokens are JWTs bound to the resource `<APP_URL>/mcp`, checked against `/api/auth/jwks` by `requireMcpAuth`.
  - Refresh tokens last 90 days and rotate.
  - The full flow is in `docs/mcp.md`.
- **HTTP surface:** `src/lib/auth/routes.ts` lets through only sign-in, Google's callback, the `oauth2/*` endpoints, jwks and metadata. Everything else under `/api/auth` answers 404.
- **Writes** (`src/lib/posts/posts.ts` and friends) check every id Claude sends against the user, report unknown posts instead of guessing, and treat sending the same post again as an update.

## 8. Dashboard and look

- **Pages:**
  - `/`: landing.
  - `/signin`.
  - `/consent`.
  - `/dashboard`: the X profile form until there is one, then the progress line with a "Your plan" link, "Connect your Claude" until it is connected, and the calendar.
  - `/dashboard/plan`: the active playbook, read-only (section 5). Also in the menu.
  - `/privacy`.
- **The look** follows the "X growth dashboard" mockup: warm stone, orange accent (`#C2410C`), Inter. All values live in `src/config/theme.ts`. A test checks WCAG AA contrast for every pair listed there.
- **Status words and chips** (`StatusBadge`):
  - Planned (grey)
  - Waiting for your take (orange outline)
  - Suggested (light orange)
  - Posted (dark)
  - Skipped (struck through)
- **Views:**
  - 30 days: a 7-column grid from 1024 px, a list of days below that.
  - Week: 7 columns from 1024 px, stacked below that.
  - Day: full cards, posts with every number and slots with their drafts.
- **Each draft** has Copy and Open in X (`x.com/intent/post?text=…`).
- **Unknown numbers** show "—".

## 9. Security and operations

- **Headers:** nosniff, `strict-origin-when-cross-origin`, a Permissions-Policy, `frame-ancestors 'none'` and `X-Frame-Options: DENY` (`next.config.ts`). HSTS is set at Cloudflare.
- **Proxy and compression:** Caddy compresses (`compress: false` in Next.js), so streamed MCP answers aren't held back.
- **Migrations** run on container start. `/api/health` pings the database, for Docker and deploys.
- **Nightly:** backups to R2, leaving out sessions, Claude's tokens and the signing keys, and a cleanup of expired sessions and tokens.
- **Rate limits:** Better Auth's, keyed on `cf-connecting-ip`. The token endpoint allows 600 a minute, because every Claude app refreshes from Anthropic's addresses.

## 10. Environment variables

Listed with explanations in `.env.example` and checked by `src/lib/env.ts`:

- `APP_URL`
- `DATABASE_URL`
- `BETTER_AUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

On the server, `POSTGRES_PASSWORD` and the optional `R2_*` values are also used by `deploy/compose.yaml` and the backup helper.

## 11. Development

- **Database:** `docker compose up -d db` (port 5433), or any local Postgres. Then `npm run db:migrate`, then `npm run dev`.
- **Sample data:** `npm run db:seed -- you@example.com`, after you sign in and add your X profile. It runs on local databases only.
- **Tests:**
  - `npm run check` runs typecheck, lint and unit tests.
  - With `TEST_DATABASE_URL` pointing at an empty database, the `*.db.test.ts` files also test the data layer and the MCP server end to end.
- **MCP by hand:**
  - MCP Inspector against `http://localhost:3000/mcp` (dynamic registration is on in development).
  - Claude Code: `claude mcp add --transport http myloopland http://localhost:3000/mcp`.
