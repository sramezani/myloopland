# Checklist

One version, ordered in sprints. Tick a task with the date when it's done (`npm run check` passes and it works in the browser or with a real MCP client).

## S0. Scaffold and docs

- [x] Next.js 16 app in SimpleDash's layout, pinned dependencies (30 Oct 2026)
- [x] ESLint with the colour and layer rules, Prettier, Vitest (30 Oct 2026)
- [x] Theme tokens from the mockup, `ThemeStyle`, contrast test (30 Oct 2026)
- [x] `env.ts`, lazy db client, `compose.yaml` (Postgres on 5433), `/api/health` (30 Oct 2026)
- [x] `CLAUDE.md`, `README.md`, `docs/` (brief, spec, checklist, story, decisions, mcp, deploy), `.env.example`, `.claude/launch.json` (30 Oct 2026)
- [x] CodeGraph index (`codegraph init -i`) (30 Oct 2026)

## S1. Sign-in and onboarding

- [x] Better Auth with Google, `x_handle` and `time_zone` on the user (30 Oct 2026)
- [x] First migration (auth, OAuth and app tables) and `proxy.ts` (30 Oct 2026)
- [x] Pages: landing, sign-in, privacy (30 Oct 2026)
- [x] The X profile form (the one input) with the browser's time zone; default playbook v1 on save (30 Oct 2026)
- [x] Top bar and user menu: connect Claude, change X profile, privacy, sign out, delete account (30 Oct 2026)
- [ ] Sign in with a real Google account, locally and in production (needs your Google OAuth client)

## S2. Core logic

- [x] Playbook schema, default and slot planner, with tests (30 Oct 2026)
- [x] Dates, calendar ranges and the playbook + rows merge, with tests (30 Oct 2026)
- [x] Stats (what worked, draft use, follower change), with tests (30 Oct 2026)
- [x] X helpers (handle, post id, compose link), with tests (30 Oct 2026)
- [x] Data layer scoped by user, with an end-to-end database test (30 Oct 2026)
- [x] `npm run db:seed -- <email>` for local sample data (30 Oct 2026)

## S3. MCP server

- [x] `@better-auth/mcp` + `jwt` + `cimd`, root `.well-known` routes, consent page (30 Oct 2026)
- [x] `/mcp`: 13 tools, 4 prompts, server instructions, routine texts (30 Oct 2026)
- [x] 401 challenge and discovery metadata checked with curl (30 Oct 2026)
- [x] Protocol, tools and prompts tested over the real handler against Postgres (30 Oct 2026)
- [ ] Full OAuth run-through with MCP Inspector and Claude Code on localhost (needs Google sign-in)

## S4. Dashboard

- [x] 30 days, week and day views, slot and post cards, drafts with Copy and Open in X (30 Oct 2026)
- [x] Progress line, Connect Claude card, empty states (30 Oct 2026)
- [x] Checked at 375 px and desktop width with sample data (30 Oct 2026)
- [ ] Keyboard-only pass on a real device

## S5. Deploy

- [x] Dockerfile, `deploy/` (setup, server command, compose, Caddy, shared proxy, cron), backups and cleanup, GitHub Actions (30 Oct 2026)
- [x] Production build passes without secrets, as CI builds it (30 Oct 2026)
- [x] Buy the domain: myloopland.com (30 Oct 2026)
- [ ] Add myloopland.com to Cloudflare (Siamak)
- [ ] Google OAuth client in production, Cloudflare Origin certificate and WAF skip rule (Siamak, `docs/deploy.md`)
- [x] Ready to open source: MIT `LICENSE`, `SECURITY.md`, README sections, no secrets or local paths in the files (30 Oct 2026)
- [ ] Create the public GitHub repository and push (Siamak)
- [ ] Turn on private vulnerability reporting: GitHub → Settings → Security (Siamak, for `SECURITY.md`)
- [ ] First deploy with `deploy/setup.sh` (with `APP_URL=https://myloopland.com`, on the SimpleDash server or a new one)

## S6. Real run

- [ ] Add the connector on claude.ai and run setup (Sia's plan becomes his playbook v2)
- [ ] Morning and evening routines by hand for 2 or 3 days, from the phone and the desktop app
- [ ] One weekly review with an approved and a skipped suggestion
- [ ] Scheduled tasks for morning, evening and weekly
- [ ] Tune the routine texts and tool descriptions from what was learned
