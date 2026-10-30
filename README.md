# myloopland

Grow your X account with your own Claude.

**Use it at [myloopland.com](https://myloopland.com).** Free, and open source (MIT).

Your Claude plans your week, drafts each day's posts, reads your numbers on X and reviews what worked. myloopland keeps all of it (the playbook, drafts, posts, numbers, notes, reviews and decisions) so every week gets a little better, and shows it on a simple calendar. You sign in with Google, type your X profile once, connect Claude, and post by hand.

- No X password, no X API: myloopland never posts for you.
- One input in the app. Everything else happens in Claude, through the MCP connector at `https://myloopland.com/mcp` (`<APP_URL>/mcp` on your own copy).
- Each user's own plan: the default is 2 posts a day, and Claude changes it with you.

## How it works

```
Your Claude ──MCP (OAuth)──▶ myloopland /mcp ──▶ Postgres ◀── /dashboard (read-only calendar)
     │
     └── reads your posts and numbers on x.com in your browser
```

The routines Claude follows (setup, morning, evening, weekly) come from the server, so there is nothing to install in Claude. See `docs/mcp.md`.

## Run it locally

Needs Node 22.13+ (24 in production) and Postgres 17.

```bash
npm install
cp .env.example .env          # then fill in the values (below)
docker compose up -d db       # Postgres on port 5433 (or use your own Postgres)
npm run db:migrate
npm run dev                   # http://localhost:3000
```

Sign in, add your X profile, and the calendar shows the default plan. For sample posts and numbers:

```bash
npm run db:seed -- you@example.com
```

Connect a local Claude Code to it:

```bash
claude mcp add --transport http myloopland http://localhost:3000/mcp
```

## Environment variables

All of them are explained in `.env.example`.

| Variable | What it is |
| --- | --- |
| `APP_URL` | The site's address, eg `http://localhost:3000` or `https://myloopland.com`. Claude's connector is `<APP_URL>/mcp` |
| `DATABASE_URL` | Postgres. Local: `postgres://myloopland:myloopland@localhost:5433/myloopland` |
| `BETTER_AUTH_SECRET` | 32+ random characters (`openssl rand -base64 48`). Signs sessions and Claude's tokens |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | A Google OAuth Web client. Redirect URI: `<APP_URL>/api/auth/callback/google` |
| `POSTGRES_PASSWORD` | Server only: the Postgres container's password (set by `deploy/setup.sh`) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | Server only, optional: nightly backups to Cloudflare R2 |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm run start` | Production build / run it |
| `npm run check` | Typecheck, lint and tests |
| `npm test` | Tests. With `TEST_DATABASE_URL` set to an empty database, also the database tests |
| `npm run db:generate` | New SQL migration from schema changes |
| `npm run db:migrate` | Apply migrations |
| `npm run db:seed -- <email>` | Sample data for a local user |

## Deploy

One command from your Mac sets up a server (it can share one with other sites set up the same way):

```bash
deploy/setup.sh azureuser@<server-ip>
```

After that, GitHub Actions deploys every merge to `main`. What to prepare first (domain on Cloudflare, Google OAuth client, optional R2) is in `docs/deploy.md`.

**Running your own copy:** nothing in the code names `myloopland.com`; the address comes from `APP_URL`, and the Caddy site block fills in its domain from it. Change the name and the "Made by" link in `src/config/theme.ts`, and check that the privacy page (`src/app/privacy/page.tsx`) is true for your server. In a fork, the deploy job in GitHub Actions stays off until `deploy/setup.sh` has set it up.

## Docs

- `docs/BRIEF.md`: what and why
- `docs/SPEC.md`: how it's built
- `docs/mcp.md`: connecting Claude, the tools and the routines
- `docs/deploy.md`: the server
- `docs/CHECKLIST.md`, `docs/STORY.md`, `docs/DECISIONS.md`: progress, session log, decisions

## Contributing

Issues and pull requests are welcome. Please keep to the principles and conventions in `CLAUDE.md` (it's the guide for Claude Code too), and run `npm run check` before opening a pull request. Ideas outside `docs/BRIEF.md` go to an issue first.

Security problems: please report them privately, as `SECURITY.md` explains.

## License

MIT, see `LICENSE`.
