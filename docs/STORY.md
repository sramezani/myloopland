# Story

A dated log per session, newest first: what was done, what was learned, problems, what's next. Written for future Claude sessions.

## 31 Oct 2026: after the first setup: analytics instead of scrolling, one daily routine, the plan page

Siamak ran the setup on claude.ai and noticed six things. All six were agreed and built.

**Done**

- **Setup reads the analytics page.** Claude had scrolled the whole profile because setup step 2 told it to read "the last 20 or so posts"; it went past other people's posts and a safety filter blocked the results. Setup now reads the bio and followers from the top of the profile without scrolling, then the user's own posts of the last 4 weeks from the analytics Content page (`type=posts` and `type=community`, `days=28`), and saves them. The optional export step is gone. Falls back to about 20 posts on the profile without the analytics page.
- **One scheduled task.** New `daily` mode and prompt: numbers (last 7 days on the analytics page), then the weekly review when the last review's period ended 7 or more days ago, then today's drafts. Morning, evening and weekly stay for anyone who wants them split. The routines are now built from shared step lists with `outline()` in `src/lib/mcp/routines.ts`, so they can't drift apart. The daily run doesn't skip yesterday's unposted slots: past days only show posts, and the stats don't use "skipped".
- **The plan page.** `/dashboard/plan` (read-only, `src/components/plan/plan-view.tsx`): version, date and why it last changed; goal, about, voice; the week; pillars with shares; rules; notes; "Change it in Claude" with lines to copy, and the daily routine line. Linked from the calendar header and the menu. `AccountMenu` (`src/app/dashboard/account-menu.tsx`) now builds the menu for both pages.
- **Plan changes in plain words** in the chat routine: "change my plan: …", "you pick each day's topic" (topics become "Claude's pick", chosen each morning) and "write my week ahead" (an opt-in playbook rule; the weekly review then drafts the next 7 days except news and takes, and the user schedules them on X themselves).
- **The Connect card** no longer lists scheduled tasks; setup offers the one task and the plan page shows it. `Copyable` moved to `components/shared` and wraps between words.
- `docs/BRIEF.md`: Siamak asked Claude to update the two kept decisions this changes (numbers read each morning; writing a week ahead as an option). Both lines are marked "changed 31 Oct 2026".
- **Followers chart** (Siamak's question: "do we store daily followers?"). Yes: every count Claude reads is a row in `account_stat`. The dashboard now shows the last 90 days above the calendar once there are readings on two days.
  - The data: `getFollowerHistory()` keeps the newest reading per local day, using `dailyFollowers()`, `consecutiveRuns()` and `niceTicks()` in `src/lib/progress/history.ts`, with tests.
  - The chart (`FollowersChart`, a client component) is plain SVG at the measured width: a line with gaps for missed days, the newest count at the end, and a crosshair readout on hover, touch or arrow keys. `FollowersCard` adds the change since the first day and a "Show the numbers" table.
  - No area fill (the axis doesn't start at 0) and no goal line (it would flatten the line). This was an idea for later in the 30 Oct entry.
- Tests: `routines.test.ts` (step numbering, setup uses 28 days with no export, daily order, instruction length), `formatWeekday`, and the MCP test now expects 5 prompts.
- **Checked:** `npm run check` passes. With a throwaway local Postgres, all 94 tests pass, the database ones included. The chart was checked with four days' readings removed (gaps and a lone point), at both widths, by hover and by keyboard. In the browser: the X profile form, then the dashboard and the plan page at 1440 px and 375 px (no sideways scroll), the menu and the plan link with the keyboard, and no console errors.

**Learned**

- The routine text decides what Claude does in the browser, word for word: "read the last 20 posts" became a full profile scroll. Point Claude at the most specific page there is.
- On a brand-new test database, the two `*.db.test.ts` files can race to migrate it, and one fails the first run only. Every run after that passes.
- A local Postgres without Docker: Homebrew's `initdb --locale=C`, then `pg_ctl -o "-p 5433 -k ''"`. Unix socket paths in the scratch folder are too long, so use TCP only.

**Problems / not done**

- Not yet tried with a real Claude: the daily routine and the new setup steps need a run on claude.ai or the desktop app (S6).

**Next**

1. Deploy, then run setup again on claude.ai and the daily routine by hand for 2 or 3 days; tune the texts.
2. Set up the daily scheduled task in the desktop app.

## 30 Oct 2026: the domain (myloopland.com), and ready to open source

**Done**

- Siamak bought `myloopland.com`. No code change was needed: Caddy's site block (`deploy/caddy/site.caddy`) is filled in from `APP_URL` on the server, and auth, the MCP address and page metadata all read `APP_URL`. Checked by rendering the site block for `https://myloopland.com` the way `deploy/myloopland` does.
- `docs/deploy.md` now uses `myloopland.com` for the Cloudflare certificate, Google OAuth (with the authorised domain) and the connector address, with a note that a copy uses its own domain. `.env.example` names it as the production example.
- Open source (MIT, Siamak's choice): `LICENSE`, `SECURITY.md` (private reports through GitHub, no email), `"license": "MIT"` in `package.json`, and README sections for the hosted site, running your own copy, contributing and the license.
- Scanned every file that would be committed: no keys, tokens, emails or IP addresses; `.env`, `deploy/secrets/`, `.codegraph/` and `*.pem` are git-ignored. The deploy log already keeps the app's own log off the public GitHub Actions output.
- Removed a local Mac path from `docs/BRIEF.md` (Siamak's OK, this once). Public-facing docs and comments no longer assume the reader knows SimpleDash; history in this file and `docs/DECISIONS.md` still names it.
- Logo files in `public/`, all from the existing loop mark (no new design): `logo.svg` (the favicon), `logo-512.png`, `logo-120.png` (the size Google's consent screen wants), and `wordmark.svg` / `wordmark.png` (the mark and the name as `<Logo />` draws them, Inter SemiBold outlined so it doesn't need the font). Made with the satori and resvg copy bundled in `next/dist/compiled/@vercel/og`, so no new dependency. To change them, edit the mark and redraw; the colours are the theme's brand and foreground.
- `npm run check` passes (76 tests).

**Next**

1. Siamak: add `myloopland.com` to Cloudflare, create the public GitHub repository and push, then turn on private vulnerability reporting (GitHub → Settings → Security).
2. Google OAuth client for `https://myloopland.com`, then `deploy/setup.sh` with `APP_URL=https://myloopland.com`.

## 30 Oct 2026: v1 built, from plan to a working local app

**Done**

- Planned v1 with Siamak (plan agreed), from the brainstorm handoff and the "X growth dashboard" mockup.
- Built all of S0 to S5 (`docs/CHECKLIST.md`):
  - the Next.js 16 app on SimpleDash's conventions;
  - Better Auth with Google, plus `@better-auth/mcp`, `jwt` and `cimd` for Claude's OAuth connection;
  - the full schema (one migration, 20 tables);
  - playbook, calendar and stats logic;
  - the data layer;
  - the MCP server (13 tools, 4 prompts, routines served from `src/lib/mcp/routines.ts`);
  - the consent page;
  - the dashboard (30 days, week and day views, onboarding, connect card, user menu);
  - SimpleDash's deploy setup adapted (`deploy/`, backups, nightly cleanup, GitHub Actions);
  - all docs.
- **Checked:**
  - `npm run check` passes: 76 unit tests.
  - With a local Postgres, 85 tests pass, including the end-to-end data layer and the MCP server over its real handler.
  - The production build passes without secrets (as CI builds it).
  - In the browser with sample data: onboarding, all three views, and phone width.
  - The whole OAuth flow on localhost with a test session: register → authorize (302 to /consent) → consent page → Allow → code → JWT bound to `/mcp` → `get_briefing` → refresh rotates.

**Learned**

- Better Auth 1.7 moved the MCP plugin out of core into `@better-auth/mcp`. `mcp()` *is* the OAuth provider (don't add `oauthProvider()` too); it needs `jwt()`, and `cimd()` for Claude's "published identity".
- `@modelcontextprotocol/server` v2's `createMcpHandler` is a plain web `Request`/`Response` handler, so no `mcp-handler` package is needed. Keep `legacy: "stateless"` (the default): Better Auth's docs say `"reject"`, but Claude's hosted apps document 2025 protocol versions.
- Better Auth answers `{ redirect, url }` JSON instead of a 302 when `sec-fetch-mode` is `cors`, and Node's `fetch` always sends that. Test redirects with curl, or follow the JSON. Its POST endpoints also need an `Origin` header.
- Better Auth's session cookie is `token.base64(HMAC-SHA256(secret, token))`, URL-encoded. Handy for local tests without Google.
- React 19 resets uncontrolled form fields after an action; return the typed value in the state to keep it.
- SimpleDash's `isIsoDay` crashes on impossible months ("2026-13-40"); fixed here in `src/lib/dates.ts`.

**Problems / not done**

- No real Google sign-in tested yet: `.env` has placeholder Google keys. Fill in a real OAuth client to sign in locally.
- claude.ai can only connect once there is a public HTTPS address (domain, deploy).
- No Docker on this Mac: the image itself was not built locally (`next build` was). CI builds it.
- The local test database was a throwaway in the session's scratch folder. Use `docker compose up -d db` or a local Postgres on port 5433.

**Next**

1. Siamak:
   - Create a Google OAuth client and fill in `.env`, then sign in locally.
   - Buy the domain and add it to Cloudflare.
   - Create the GitHub repository and push.
2. `deploy/setup.sh` (it can share the SimpleDash server), then add the connector on claude.ai.
3. S6: run setup with Sia's plan as playbook v2, then the morning, evening and weekly routines by hand for a few days. Tune the routine texts and tool descriptions.

**Ideas for later (not in v1)**

- A daily reply count, if the weekly review needs it.
- Several X accounts per user.
- A small chart of followers over time on the dashboard.
