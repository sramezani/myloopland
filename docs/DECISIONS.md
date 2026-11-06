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

## After the first setup (31 Oct 2026)

| Decision | Why |
| --- | --- |
| Setup reads 4 weeks from X's analytics Content page (posts and community, `days=28`) and saves them; no export, no profile scrolling | Only the user's own posts, already sorted, with impressions, profile visits and new follows. Scrolling the profile went past other people's posts, was slow and tripped a safety filter. 28 days is the window the briefing and the weekly review use |
| One scheduled task, the daily routine (numbers, then the weekly review when it's due, then drafts), instead of three | One task to set up and keep running, and the drafts know how yesterday went. Morning, evening and weekly stay as modes and prompts for anyone who wants them split |
| Numbers are read the next morning, not the same evening (Siamak, changes the brief's "each evening") | They keep moving for a day or two anyway, and each run reads the last 7 days again |
| The daily run reviews the week when the last review's period ended 7 or more days ago | It catches up after a missed run without depending on the weekday |
| The routines share their step lists (`outline()` in `routines.ts`) | The daily routine and the single ones can't drift apart |
| A read-only plan page, `/dashboard/plan`, linked from the calendar and the menu | The user sees the goal, voice, pillars, rules and why the plan last changed; Claude stays the only writer |
| Plan changes in plain words through the chat routine ("change my plan: …") | No form to build; Claude saves a new version with a summary, so history is kept |
| "Claude's pick" as a slot topic | Lets Claude choose each day's topic with no schema change |
| Writing a week ahead is an opt-in playbook rule (Siamak, changes the brief's "drafts on the day") | For users who'd rather schedule a week on X themselves. News and takes are still written on the day, and myloopland and Claude still never schedule |
| The scheduled task lives in setup and on the plan page, not on the Connect card | The first screen has one job, and Claude offers the task when it knows the user's times |
| `Copyable` moved to `components/shared`, wrapping between words (`wrap-anywhere`) | The Connect card and the plan page both use it; sentences no longer break mid-word |
| A followers chart on the dashboard (Siamak): 90 days, one point per local day, from `account_stat` | The counts were already kept; the progress line only showed the latest and the change |
| Missed days are gaps in the line | Never invent: no reading means no point |
| A line with no area fill, and no goal line | The axis doesn't start at 0, so a fill overstates growth; a far goal would flatten the line |
| The chart is plain SVG measured with `ResizeObserver`, no chart library | One series and a crosshair don't need a dependency; lines and text stay crisp at any width |
| The deploy workflow uses `docker/setup-qemu-action@v4`, `setup-buildx-action@v4` and `build-push-action@v7` | The older majors run on Node 20, which GitHub Actions deprecated (a warning on every deploy). The new ones run on Node 24, and what they removed isn't used here. SimpleDash got the same change |

## Backlinks (5 Nov 2026)

| Decision | Why |
| --- | --- |
| A backlinks list in myloopland, as its own tab (Siamak, beyond the brief) | Submitting products for links is repeat work Claude can help with, and the list keeps track across sessions |
| The tick on each place is the app's second input (Siamak, changes the brief's "one input") | Ticking is quicker on the page than in a chat; Claude can still tick one when told |
| One list per account, not per product (changed on 6 Nov: one per website, below) | Simple first; products can come later if needed |
| One row per address (`url_key`: no scheme, `www.`, query, hash or trailing slash), unique per user (per website since 6 Nov) | Claude can't add the same place twice, and different pages of one site (subreddits) stay apart |
| The starter list is copied in on the first read, not at sign-up or in a migration (changed on 6 Nov: when a website is added) | Works for existing and new users alike, with no backfill; a unique index makes two first reads at once safe |
| Starter notes suit any product; field-specific places are left to Claude | The app is for anyone; Claude searches the user's own field |
| Link type is null unless known (DevHunt's free listing and Reddit are nofollow) | Never invent |
| Claude never submits, signs up or posts; it only finds and saves places | Same rule as never posting on X |
| Ticks save at once (`useOptimistic`), roll back with a message pinned to the bottom of the screen if saving fails | Feels instant on a phone; a failure is never silent and is seen wherever the list is scrolled |
| A row ticked under a filter stays in view until the filter or search changes | Nothing jumps away under the pointer |
| No reordering, deleting or "live" state yet | Not asked for; Claude can note a closed place |
| `segmentedGroup` and `segmentedItem` exported from `SegmentedLinks` | The list filter is buttons, not links, but looks the same |
| shadcn `checkbox`, added with its CLI; the `cn` package the CLI added was removed again | The part imports the project's own `cn` from `lib/utils`, so the package isn't needed |

## Backlinks per website (6 Nov 2026)

| Decision | Why |
| --- | --- |
| One backlinks list per website, picked from a menu next to the title (Siamak) | Backlinks belong to a domain: the right places differ by product, and a tick means "this website is submitted there" |
| Websites are an app input; the page asks for one before showing any list (Siamak) | No list makes sense without knowing what it's for |
| A `website` table; `backlink` gets `website_id` and keeps `user_id` | Every query stays scoped to the user, as everywhere else |
| Adding a website copies the starter list in, in one transaction; no more seeding on first read | The list exists from the moment the website does, so reads never write |
| The unshipped `0001_backlinks` migration was regenerated, not followed by a 0002 | It had only run on throwaway local databases; production never saw it |
| A website is cleaned on the way in: `https://` added when missing, no query, hash or trailing slash; a page such as a GitHub repo is allowed | People type "simpledash.com"; open source lives on GitHub |
| Adding a website that's already there opens it instead of failing | One less error, the same result |
| Up to 20 websites, no removing yet | Plenty for one person; removing wasn't asked for |
| The open website is in the address (`?site=simpledash.com`), not remembered elsewhere | Readable and shareable, no cookie or stored state; the first website opens without it |
| Claude can't add websites; `get_backlinks` and `save_backlinks` take an optional `website`, needed when there are several | Websites are the user's input; the error names their websites, so Claude asks |
| `get_backlinks` drops the playbook's `about`; the routine opens the website instead | The website says what the product is better than the X playbook does |
| `OneFieldForm` in `components/shared`, used by the X profile form and the website form | Reuse first: the same one-field form, label, error and kept value |

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
