# Story

A dated log per session, newest first: what was done, what was learned, problems, what's next. Written for future Claude sessions.

## 30 Oct 2026: the domain (myloopland.com), and ready to open source

**Done**

- Siamak bought `myloopland.com`. No code change was needed: Caddy's site block (`deploy/caddy/site.caddy`) is filled in from `APP_URL` on the server, and auth, the MCP address and page metadata all read `APP_URL`. Checked by rendering the site block for `https://myloopland.com` the way `deploy/myloopland` does.
- `docs/deploy.md` now uses `myloopland.com` for the Cloudflare certificate, Google OAuth (with the authorised domain) and the connector address, with a note that a copy uses its own domain. `.env.example` names it as the production example.
- Open source (MIT, Siamak's choice): `LICENSE`, `SECURITY.md` (private reports through GitHub, no email), `"license": "MIT"` in `package.json`, and README sections for the hosted site, running your own copy, contributing and the license.
- Scanned every file that would be committed: no keys, tokens, emails or IP addresses; `.env`, `deploy/secrets/`, `.codegraph/` and `*.pem` are git-ignored. The deploy log already keeps the app's own log off the public GitHub Actions output.
- Removed a local Mac path from `docs/BRIEF.md` (Siamak's OK, this once). Public-facing docs and comments no longer assume the reader knows SimpleDash; history in this file and `docs/DECISIONS.md` still names it.
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
