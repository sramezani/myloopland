# Story

A dated log per session, newest first: what was done, what was learned, problems, what's next. Written for future Claude sessions.

## 12 Nov 2026: the Ideas tab

Siamak asked for an Ideas tab: post ideas that Claude (and Codex, through the same connector) suggests and rates from 1 to 10, which he rates too and ticks once published. Claude reads the list before suggesting more, so nothing repeats. One question before building: the spec had `claude_rating` required, but Codex can add ideas too. Siamak chose "the rating goes to the saver", so `claude_rating` is nullable.

**Done**

- **Spec first:** section 13 of `docs/SPEC.md`, plus sections 1, 2, 3, 4 and 8; decisions logged ("Ideas"); principle 1 in `CLAUDE.md` now lists the two new page inputs.
- **Table `idea`** (`drizzle/0002_ideas.sql`): title, description, details, the three ratings (nullable, with a check constraint for 1 to 10), published, source, timestamps. Up to 1,000 per user.
- **Data** (`src/lib/ideas/`):
  - `summary.ts` (pure, used by the page too): `IdeaItem`, `isRating`, `sortIdeas`. Newest first by default, or a rating, highest first; unrated always last; ties newest first.
  - `similar.ts`: near-duplicate titles. 80% of the words the same, after dropping case, punctuation, small words and plural "s". A typo counts as the same word in words of 5 letters or more; numbers and shorter words must match exactly ("first 100 followers" and "first 1000 followers" are two ideas).
  - `ideas.ts`: `listIdeas`, `saveIdeas` (the rating goes in the saver's column; skipped ideas are named with the one they match), `rateIdea`, `setMyRating`, `setIdeaPublished`, `countIdeas`. Ideas saved in one call are a millisecond apart, so newest first keeps the order Claude sent them in.
- **MCP:** `get_ideas(published?, sort?, limit?)`, `save_ideas(source?, ideas[])`, `rate_idea(idea_id, rating)`. The server instructions name them, and the chat routine has "give me post ideas" (get_ideas first), "rate the ideas" (Codex) and "which ideas should I write next?".
- **Page** (`/dashboard/ideas`, tabs now Calendar, Ideas, Backlinks):
  - `IdeaTable` (client): the rating headings cycle highest first, lowest first, newest first. The card title names the order, and `aria-sort` and a live message follow it.
  - My rating (a native select, "—" clears it) and the published tick save at once and roll back with a message if saving fails. Rows keep their place while rating; the order changes only on a heading click.
  - One `<table>` with explicit roles. Below 640 px the rows become blocks with small labels, and the headings become sort buttons in a row.
  - `AskForIdeas`: lines to copy, labelled "In Claude" and "In Codex"; it is also the empty state.
- **Reuse:** shadcn's `native-select` came in with the CLI. The new registry imports `cn` from a separate `cn` package and added it to `package.json`. I put `package.json` and the lockfile back and pointed the part at `@/lib/utils`, so there's no new dependency. It also has an `lg` size (36 px, 44 px for touch).
- **Seed:** `npm run db:seed` adds 6 sample ideas (one from Codex, two published).
- **Other docs:** README, `docs/mcp.md` (tools, chat routine, a Codex note), the privacy page and the delete-account text.
- **Tests:** `similar.test.ts`, `summary.test.ts`, `src/app/actions/ideas.test.ts` (the two server actions, with the session and data layer mocked), `routines.test.ts`, a database test for the data layer (scoping to the user and the check constraint included), and the MCP test (18 tools; save, skip, list, filter, sort, rate, errors). `npm run check` passes; with `TEST_DATABASE_URL`, all 134 tests pass.
- **Fixed a flaky test** (older than this session, Siamak's OK): `data.db.test.ts` adds the same website twice at once and expected the first address to win, but in about 2 runs in 9 the `www.` one won. It now checks the key and accepts either address. 12 runs in a row passed after.
- **Checked in the browser** with a local test session and the seed:
  - the empty state, sorting by each heading, rating, ticking, and the rollback message (an idea deleted behind the page's back);
  - the keyboard: headings with Enter, the tick with Space;
  - 375 px (no sideways scroll; the sort buttons fit one row) and 1440 px; no console or server errors.

- **Later the same day (Siamak):** Claude can re-rate its old ideas too. `rate_idea(idea_id, rater, rating)` sets Claude's or Codex's rating on any idea, whoever added it. `rater` is required, so neither one overwrites the other's rating by leaving it out, and the user's rating can't be set through the tools. The chat routine has "re-rate my old ideas". The database and MCP tests cover re-rating, rating the other's idea, and refusing a missing or "my" rater. All 134 tests pass.

**Learned**

- `npx shadcn add` now writes `import { cn } from "cn"` and installs that package. Check `package.json` after every shadcn add.
- `useOptimistic` plus a frozen order (ids saved when a heading is clicked) keeps a just-rated row from jumping away when the table is sorted by that rating.
- Ideas inserted in one statement share `now()`, so "newest first" was random within a batch until each got its own `created_at`.

**Problems / not done**

- Nothing committed; Siamak handles git.
- Not tried with a live Claude or Codex; the tools were tested over the real MCP handler. Codex in production needs Client ID Metadata Document support, because open registration is only on in development (`src/lib/auth/auth.ts`). If Codex can't do that, it's Siamak's call whether to open registration.
- On a brand-new test database, the two `*.db.test.ts` files still race to migrate on the first run (known since 31 Oct).

**Ideas (not built)**

- A filter on the page (unpublished only), if the list grows long.
- Link a published idea to its post on the calendar.

**Next**

- After the deploy: "give me 10 post ideas" in Claude, then try connecting Codex and "rate the ideas".

## 6 Nov 2026: one backlinks list per website

Siamak pointed out that backlinks belong to a domain, so the list should be per website: a dropdown at the top shows the open website, the first visit asks for a website instead of showing every place, and "Add website" at the end of the dropdown opens a small dialog. No removing for now.

**Done**

- **Data:**
  - New `website` table (url, `url_key`, unique per user); `backlink` gets `website_id`, unique per website.
  - `addWebsite` cleans what was typed (`https://` added when missing, no query or trailing slash; a GitHub repo counts as a website). It copies the 40 starter places in, in one transaction. Re-adding a website just opens it. The limit is 20.
  - Lazy seeding on first read is gone. `listBacklinks` and `saveBacklinks` take the website id.
  - The `0001_backlinks` migration was regenerated rather than followed by a 0002, since it had only ever run on throwaway databases.
- **MCP:**
  - `get_backlinks(website?)` and `save_backlinks(website?, …)`. With one website it's used without asking. With several and none named, the error lists them so Claude asks. With none, the error says to add one on the page.
  - `get_backlinks` now returns `website` and `websites` instead of the playbook's `about`; the routine says to open the website to learn what it is.
  - The routine, the chat line ("I submitted simpledash.com to SaaSHub"), the server instructions and the prompt text say "website".
- **Page:**
  - `?site=simpledash.com` picks the website; without it, the first one added opens.
  - The header is now its own block (`BacklinksHeader`): title, the picker (`WebsitePicker`: websites as links with a tick on the open one, then "Add website" opening a `Dialog`) and "Find more with Claude" (hidden on phones, where the card is a short scroll away).
  - `BacklinkList` is keyed by website, so the filter and search reset when switching.
  - `FindMore` lines name the website.
- **Reuse:** `OneFieldForm` (components/shared) now holds the one-field form. The X profile form and the new `WebsiteForm` both use it. That also fixed a duplicate id: the X profile card and its input were both `x-profile`.
- **Docs:** SPEC sections 1, 2, 4, 8 and 12, DECISIONS ("Backlinks per website"), mcp.md, README, CLAUDE.md principle 1, privacy page, delete-account text.
- `npm run check` passes (109 tests with a test database). Checked in the browser:
  - the first-run card, the error for "not a website", adding a site, and adding a GitHub repo from the dialog;
  - switching sites with the mouse and the keyboard, and ticks staying separate per website;
  - re-adding an existing site;
  - 375 px with no sideways scroll and the long address truncated, and 1440 px.

**Learned**

- The shared `Button` has `shrink-0` built in. In a row that must fit a phone, add `shrink` (and `min-w-0`) or a long label pushes the page sideways.
- A server action's revalidation can unmount the form before its effect runs. On the first-run card the page simply re-renders with the new website (the URL has no `?site`); in the dialog the effect runs and opens the new website's address.

**Problems / not done**

- Nothing deployed or committed; Siamak handles git.
- The open website isn't remembered: going to Calendar and back opens the first website. Fine with one or two websites.

**Ideas (not built)**

- Remember the last website opened (a cookie), if switching gets annoying.
- Removing or renaming a website.
- Per-website counts in the menu ("12/40").

**Next**

- After the deploy: in Claude, "find new backlink places for simpledash.com", then tune `BACKLINK_ROUTINE`.

## 5 Nov 2026: the backlinks list

Siamak wanted to submit SimpleDash to launch sites and directories for backlinks, and asked whether that belongs in myloopland. We talked it through first: it's outside the brief, and directory submission is mostly a one-off batch per product. The part that keeps repeating is outreach, which works like cold email. He chose to build it anyway, for his own products and for anyone else who wants it: a Backlinks tab with a checkbox on each place, and a way for Claude to find and add new ones.

**Done**

- **Spec first:** section 12 of `docs/SPEC.md`, plus the top bar, data model, layers and pages. Decisions are logged, including the change to the brief's "one input" and principle 1 in `CLAUDE.md`.
- **Table `backlink`** (`drizzle/0001_backlinks.sql`): name, url, `url_key` (unique per user), category (launch, directory, community), cost, note, `link_type` (null when unknown), position, `added_by` (starter or claude), `submitted_at`.
- **Starter list** (`src/lib/backlinks/starter.ts`): 40 places from Siamak's research, with notes that suit any product. Every address was checked with curl: BetaPage now redirects to Pitchwall, and PeerPush moved to .com. r/GoogleAnalytics and r/analytics were left out because they only fit analytics tools; Claude should add them for SimpleDash. The list is copied in on the first read (`listBacklinks`), so existing users get it too.
- **Data layer** (`src/lib/backlinks/`): `listBacklinks`, `setBacklinkSubmitted` (ticking again keeps the first date), `saveBacklinks` (add, update by id, skip places already listed), `urlKey` and `displayUrl`, plus pure helpers (`countBacklinks`, `isNewPlace`, `matchesSearch`).
- **MCP:** `get_backlinks` (list, counts, playbook `about`, steps) and `save_backlinks`; `BACKLINK_ROUTINE` and the `backlinks` prompt ("Find new backlink places"); a chat line for "I submitted to SaaSHub"; a sentence and a "never submit or sign up" rule in the server instructions. 15 tools and 6 prompts now.
- **UI:**
  - The top bar has tabs (Calendar, Backlinks), with an underline for the current one, on their own row below 640 px. There are no tabs before the X profile is added.
  - `/dashboard/backlinks`: a progress card (overall and per category), a filter (All, To do, Submitted, and New when Claude added places in the last 14 days), and search with a `/` shortcut and Escape to clear.
  - One card per category. Each row has a checkbox (44 px target), the name linking out, the address, the note, and cost, link type and "Submitted 5 Nov" chips.
  - Ticks are instant (`useOptimistic`), announced to screen readers, and roll back with a toast pinned to the bottom if saving fails. A row ticked under a filter stays in view until the filter changes.
  - A "Find more with Claude" card has lines to copy.
- shadcn `checkbox`, added with the CLI. Privacy page and delete dialog mention the list.
- Tests: `backlinks.test.ts` (keys, starter list, counts, new, search); database tests for seeding once (two reads at once), ticks, duplicates, other users' ids and delete; MCP tests for both tools, the input checks and the new prompt.
- **Checked:**
  - `npm run check` passes, all 107 tests pass with `TEST_DATABASE_URL`, and `next build` compiles.
  - In the browser with a local session: onboarding (no tabs), then the calendar and backlinks at 1440 px and 375 px (no sideways scroll).
  - Ticking saves to the database. Filter, New and search work, and so does the no-match state. The keyboard works (Space ticks, the focus ring shows, `/` focuses search).
  - A failed save (row deleted underneath) rolls back with the toast.

**Learned**

- The shadcn CLI (4.23) wrote `import { cn } from "cn"` into the checkbox and added a `cn` npm package. Fix the import to `@/lib/utils` and restore `package.json` and the lockfile after `shadcn add`.
- A local Postgres from Homebrew on macOS needs `LC_ALL=C` when starting (`pg_ctl`), or it stops with "postmaster became multithreaded during startup".
- The in-app browser pane's screenshots lag a step when the pane is hidden, and typing there only inserts text (no key events). Check state with JavaScript instead.
- The first run of the database tests on a brand-new database still races once (as on 31 Oct); the second run passes.

**Problems / not done**

- Not tried with a real Claude yet (`find new backlink places`): needs the deploy, or local Google sign-in for OAuth.
- One list per account: ticks aren't per product. Fine for now; a product field is the change if it's needed.

**Ideas (not built)**

- A "live" state with the listing's address, to check later that the link is still up.
- A product on each tick, once there's a second product to launch.

**Next**

1. Deploy, then ask Claude to "find new backlink places for SimpleDash" and check what it adds.
2. Then the S6 items: the daily routine by hand, and the scheduled task.

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
- **Deploy warning fixed:** GitHub Actions warned that `setup-buildx-action@v3` and `build-push-action@v6` run on the deprecated Node 20. `.github/workflows/deploy.yml` now uses `setup-qemu-action@v4` (also Node 20 before; it only runs for non-amd64 builds), `setup-buildx-action@v4` and `build-push-action@v7`, all Node 24. Their breaking changes (removed deprecated inputs and build-summary env vars) don't touch this workflow. The same change went into SimpleDash, with its own story entry (Session 19) and decisions line.
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
