# myloopland: brief for Claude Code

myloopland helps anyone grow their X account with their own Claude. The user's Claude (claude.ai, desktop, mobile, Claude Code) does the work through an MCP connector: it plans the week, drafts each day's posts, reads the numbers on x.com and reviews what worked. myloopland keeps the data (playbook, drafts, posts, numbers, notes, reviews, decisions), so every Claude session learns from the last ones, and shows it on a read-only calendar. Google sign-in, one input (the X profile), no pricing.

- **What and why:** `docs/BRIEF.md`. This is Siamak's brief; don't edit it.
- **How:** `docs/SPEC.md`. Update the spec before building something differently, and log the change in `docs/DECISIONS.md`.
- **Claude's side:** `docs/mcp.md` (connecting, OAuth, tools, routines). **Server:** `docs/deploy.md`.

## Every session

1. **Start:** read this file, `docs/CHECKLIST.md` and the latest entry in `docs/STORY.md` (newest is at the top).
2. **Find code with CodeGraph first** (`codegraph_*` tools) before reading or searching files. Refresh the index after large changes with `codegraph sync`.
3. **Plan before coding.** Ask Siamak when something is unclear.
4. **End:** add a dated entry to `docs/STORY.md`.

## Principles

These are not up for debate. Anything that would break one goes to Siamak first.

1. **Claude does the work; myloopland keeps the data.** The web app's only input is the X profile. Everything else arrives through the MCP tools.
2. **Never post, schedule or reply on X**, and the server never calls X. Numbers come from Claude reading the user's own X analytics page (or a screenshot).
3. **Never invent.** Drafts come from the user's notes, real events and public news. Numbers come from X. Unknown is "—", never 0.
4. **It's the user's plan.** The playbook is only a starting point: any number of posts a day, any times, any mix. Nothing is enforced.
5. **Keep history.** Playbook versions, metric snapshots, picked, edited and skipped drafts, and decisions are kept, so Claude can learn.
6. **Store little.** The Google name, email and image, the X handle, the time zone, and the user's own post data.
7. **Simple beats complete.** Reuse first; no feature that isn't in the brief (ideas go to `docs/STORY.md`).

## Stack (details in `docs/SPEC.md`)

| Area | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, standalone Docker image), React 19, TypeScript 6.0 (pinned) |
| UI | Tailwind CSS 4, shadcn/ui and lucide icons. Light theme only |
| Theme and brand | One file, `src/config/theme.ts`, written into each page as CSS variables |
| Database | Postgres 17 (a container on the server; any Postgres works), Drizzle ORM and postgres.js |
| Auth | Better Auth: Google sign-in, plus `@better-auth/mcp` (the OAuth server for Claude) with `jwt()` and `@better-auth/cimd` |
| MCP | `@modelcontextprotocol/server` v2 (`createMcpHandler`) in `src/app/mcp/route.ts`, stateless |
| Hosting | One server with Docker Compose and Caddy, behind Cloudflare. `deploy/setup.sh` sets it up in one command; GitHub Actions deploys every merge to `main`. Backups go to Cloudflare R2 |
| Tests | Vitest. Unit tests everywhere; database tests run when `TEST_DATABASE_URL` is set |
| Package manager | npm |

## Commands

```bash
npm run dev               # dev server on http://localhost:3000
npm run build             # production build (standalone output)
npm run check             # typecheck + lint + tests: run before ticking a task
npm run typecheck         # next typegen && tsc --noEmit
npm run lint              # eslint .
npm run format            # prettier --write .
npm test                  # vitest run (database tests skip without TEST_DATABASE_URL)
npm run db:generate       # drizzle-kit generate: SQL migration from schema changes
npm run db:migrate        # apply migrations
npm run db:seed -- <email>  # sample data for a local user (local databases only)
docker compose up -d db   # local Postgres on port 5433
deploy/setup.sh user@ip   # Siamak only: set up (or, with --from, move to) the production server
```

## Conventions

- **Data access:** only `src/lib/*` touches the database. Every data function takes `userId` first and scopes every query to it. Never trust an id from Claude or the browser without checking it belongs to the user.
- **One data layer for both sides:** the dashboard and the MCP tools call the same functions (`getCalendar`, `getProgress`, `getStats`, …).
- **Access checks:** every signed-in page and server action starts with `requireUser()`. The MCP route gets the user from the verified access token only.
- **Env vars:** read them only through `src/lib/env.ts` (checked with Zod at startup).
- **MCP tools:** inputs are Zod schemas in snake_case with plain descriptions. A problem Claude can fix is a `UserFacingError` with one plain sentence. The routines live in `src/lib/mcp/routines.ts` only.
- **Dates:** ISO day strings and "HH:MM" times in the user's own time zone (`src/lib/dates.ts`). Weeks start on Monday.
- **Components:** server components by default. Client components only for interaction: Copy, forms, the menu, sign-in and consent buttons.
- **Theme tokens only:** `src/config/theme.ts` is the only place for colours. Use token classes such as `bg-primary` and `text-muted-foreground`. Never hex, `rgb()`, palette classes (`bg-blue-500`) or arbitrary colour classes. Lint and tests enforce this.
- **Reuse first:** before writing a component, helper or util, look in CodeGraph, `src/components/ui`, `src/components/shared` and `src/lib`. Add shadcn parts with its CLI. Extend with a prop or a `cva` variant instead of copying.
- **Layers:** `src/config` → `components/ui` → `components/shared` → feature folders (`account`, `calendar`, `onboarding`, `plan`) → `src/app`. Each imports only from its own folder and the layers before it, and shared blocks never fetch data. ESLint enforces it.
- **UI quality:** mobile first; the user copies drafts from their phone. Check UI changes at 375 px and 1440 px and with the keyboard only.
- **Tests:** next to the code (`*.test.ts`). Database tests are `*.db.test.ts` and need `TEST_DATABASE_URL` (an empty database they may write to).
- **Docs:** plain words. Refer to a part of a doc as "section 6", never with symbols.

## Working rules

**Project files**

| File | Purpose | Updated when |
| --- | --- | --- |
| `CLAUDE.md` | This brief | When a rule or convention changes |
| `README.md` | What it is, setup, every environment variable, scripts | After every change that affects setup, running or features |
| `docs/BRIEF.md` | Siamak's requirements (don't edit) | Never by Claude |
| `docs/SPEC.md` | Technical spec: architecture, data model, calendar, auth, screens | Before building something differently |
| `docs/CHECKLIST.md` | Sprint tasks as checkboxes, in plain words | Tick each task as it finishes, with the date |
| `docs/STORY.md` | Dated log per session: done, learned, problems, next. Written for future sessions | At the end of every session |
| `docs/DECISIONS.md` | Each technical decision and dependency with a one-line reason | Whenever a decision is made |
| `docs/mcp.md` | Connecting Claude, the OAuth flow, the tools and the routines | When a tool or routine changes |
| `docs/deploy.md` | The one-command deploy and running the server | When deploy changes |

**Rules**

1. **Never commit, push or touch git history.** No `git commit`, `git push`, branches or PRs. Siamak handles all git work.
2. **Start every session** by reading `CLAUDE.md`, `docs/CHECKLIST.md` and the latest entry in `docs/STORY.md`.
3. **Use CodeGraph first**, and refresh its index after large changes.
4. **Plan before coding**, and ask Siamak when something is unclear instead of guessing.
5. **Stay inside the brief.** Suggest ideas in `docs/STORY.md` instead.
6. **Definition of done:** `npm run check` passes; the feature works in the browser (and, for tools, with a real MCP client); `docs/CHECKLIST.md` is ticked; `README.md` and the relevant `docs/` file are updated.
7. **End every session** with a `docs/STORY.md` entry.
8. **No secrets** in code, docs or logs. Keep them in `.env` files only and list them in `.env.example`.
9. **Every new dependency** gets a line in `docs/DECISIONS.md`.
