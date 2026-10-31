# myloopland: the brief

Siamak's requirements, from the planning session on 30 October 2026. This is the "what and why". Claude doesn't edit this file; changes to how things are built go to `docs/SPEC.md` and `docs/DECISIONS.md`.

## The goal

**The user's X account grows.** That is what every part is for.

- Everything is done in the user's own Claude app. myloopland only holds the data, so Claude can analyse it and improve its suggestions over time.
- It must not be a blind post generator. It keeps every post, its numbers and every decision, so Claude can learn from them.
- It is not only for Siamak (@siaramzee): anyone can sign in and use it with their own Claude.
- Sia's own target, from the first brainstorm: @siaramzee from 243 to 1,000 followers by October 2027 (about 15 a week), known as a builder of small products with AI agents.

## What it has (at least)

1. **As simple as possible**, following best practices.
2. **Name:** myloopland. Siamak creates the repository. There is no domain yet.
3. **Project files:** `CLAUDE.md`, `STORY.md`, `CHECKLIST.md` and any other Markdown file that helps future sessions.
4. **One version.** Sprints are only a way to order the work.
5. **Own Postgres database**, not Supabase or similar.
6. **Google sign-in, and one input: the user's X profile address.** No other input. Everything else happens in Claude, which updates the database. The dashboard is only for viewing.
7. **An MCP server** that connects Claude to the service to read data, and the APIs to update what's needed.
8. **The rules differ per user.** For example, how many posts a day: nothing is forced on the user. It depends on their plan with Claude, and Claude drafts as many as it decides.
9. **A default plan**, for example 2 posts a day, as the playbook. The user sees it in Claude and changes it if they want.
10. **Simple design**, like the "X growth dashboard" mockup Claude made: a 30-day calendar of the coming and previous days, which the user can switch to a week or day view, showing the drafted upcoming posts with their time, suggestions and so on.
11. **Reusable components** everywhere.
12. **A simple one-command deploy**, `setup.sh`, as in SimpleDash.
13. **No pricing, no Stripe.**

## Decided in the planning chat (kept)

- Drafts are written on the day itself by default, from that day's news and the user's notes. Future days show the planned topic only. A user who would rather schedule a week on X themselves can ask Claude to write the week ahead, except news and takes (changed 31 Oct 2026).
- Never invent opinions, numbers or events. Never post or schedule anything on X: the user posts by hand.
- The playbook lives in the database, versioned. The weekly review changes it only after the user approves, and logs the decision.
- Numbers are read each morning, by the one scheduled daily routine, from X's analytics Content page in the user's browser (`x.com/i/account_analytics/content`, posts and community, last 7 days). Setup reads the last 28 days there once. Nothing is ever downloaded or exported (changed 31 Oct 2026).
- Replies are not tracked.
- Sia's own plan (12 posts a week, his weekly rotation and topic mix) becomes his playbook in his setup chat with Claude. His `x-posts` skill keeps setting his voice.
