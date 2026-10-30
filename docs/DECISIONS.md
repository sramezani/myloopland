# Decisions

Each technical decision and each dependency, with a one-line reason. Newest at the bottom of each list.

## Product and architecture (30 Oct 2026)

| Decision | Why |
| --- | --- |
| SimpleDash's stack, conventions and deploy, trimmed | Proven, and the code and deploy could be copied instead of written |
| One Next.js container (pages, auth, MCP) plus Postgres | Simplest thing that works |
| The MCP endpoint is the only write API; no REST API | Claude is the only writer; pages read the database on the server |
| MCP sign-in is OAuth through Better Auth on the same Google sign-in | Standard for remote MCP; the user clicks Connect and Allow, with no keys to copy or leak |
| Claude is identified by CIMD; open dynamic registration only in development | Claude's recommended setting, and the 2026 MCP spec deprecates dynamic registration |
| Routines live in the MCP server (prompts, `get_briefing`, instructions), not in a skill | Every user and every Claude app gets them with no install, and they improve with each deploy |
| Playbook in the database, one row per version, newest active | Each user's rules differ, and history lets Claude learn |
| Future slots are worked out from the playbook on read; rows only when something happens | No job to roll the plan forward; playbook changes show at once |
| Numbers from X's analytics Content page in the user's browser, no download; profile or screenshot as fallback | One page has every post's numbers, including profile visits and follows; free and keyless |
| Replies aren't tracked | Too many, and they'd flood the calendar |
| Community posts are their own `kind` | So the weekly review can compare them with normal posts |
| Metrics are snapshots (`post_metric`), never overwritten | A 7-day curve per post, and history for analysis |
| `user.x_handle` and `user.time_zone` as Better Auth additional fields | One table less; the session carries them (the dashboard still reads them fresh from the database) |
| The time zone comes from the browser on the X profile form | The plan's times are the user's own without a second input |
| Tokens bound to `<APP_URL>/mcp`, JWTs checked against JWKS | No database round trip per MCP call |
| Refresh tokens last 90 days | Scheduled tasks run unattended and shouldn't drop off after a quiet month |
| Token endpoint rate limit raised to 600 a minute | Every Claude app refreshes from Anthropic's addresses, one address for all users |
| IP tracking stays on (keyed on `cf-connecting-ip`) | Better Auth's rate limits need it; SimpleDash turned it off but had fewer public endpoints |
| `legacy: "stateless"` (the SDK default), not `"reject"` | Claude's hosted apps document 2025 protocol versions; rejecting them would break connecting |
| No `cacheComponents` | The dashboard is per-user and dynamic; static pages are static anyway |
| Sign-in through Better Auth's browser client | The documented way to carry Claude's signed OAuth query through Google sign-in |
| The 30-day view is a grid from 1024 px and a day list below | Seven columns at tablet width cut every label short |
| Light theme only; the mockup's palette as tokens | The "X growth dashboard" mockup |
| Database tests (`*.db.test.ts`) run only with `TEST_DATABASE_URL` | Real end-to-end checks locally without a database in CI |
| Backups leave out sessions, Claude's tokens and the signing keys | Live credentials don't belong in backups; reconnecting once after a restore is fine |
| A nightly cleanup of expired sessions and tokens, run in the backup helper | Better Auth doesn't delete them, and there is no jobs route to do it |
| Local Postgres on port 5433 | It runs next to SimpleDash's local Postgres on 5432 |
| The domain is myloopland.com, but the code never names it | Everything follows `APP_URL` (Caddy, auth, MCP, metadata), so forks run on their own domain with no code change |
| Open source under MIT (Siamak) | Simplest permissive license; anyone can use, change and host it |
| Security reports through GitHub private vulnerability reporting | No personal email in the repository |

## Dependencies

| Package | Why |
| --- | --- |
| `next`, `react`, `react-dom` | The framework (as SimpleDash) |
| `typescript` 6.0.3 (pinned) | As SimpleDash; TypeScript 7 is newer than its tooling |
| `tailwindcss`, `@tailwindcss/postcss`, `tw-animate-css`, `shadcn`, `radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` | The UI kit (as SimpleDash) |
| `drizzle-orm`, `drizzle-kit`, `postgres` 3.4.9 | Database (as SimpleDash; postgres.js 4 is too new for Drizzle 0.45) |
| `zod` | Validation of env, forms, the playbook and every MCP input |
| `better-auth` 1.7.14, `auth` (CLI) | Google sign-in and sessions; the CLI generates its tables |
| `@better-auth/mcp` | The OAuth 2.1 server for MCP clients (moved out of Better Auth core in 1.7) |
| `@better-auth/oauth-provider` | What `@better-auth/mcp` is built on; also the browser client plugin |
| `@better-auth/cimd` | Client ID Metadata Documents: how Claude identifies itself |
| `@modelcontextprotocol/server` 2.4 | The official MCP SDK v2: `createMcpHandler` works on web Request/Response, so no `mcp-handler` and no Redis |
| `server-only` | Keeps server modules out of client bundles |
| `vitest`, `eslint`, `eslint-config-next`, `prettier`, `prettier-plugin-tailwindcss` | Checks (as SimpleDash) |
