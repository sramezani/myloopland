import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The MCP server over its real HTTP handler, against a real Postgres: protocol, tools and
 * prompts as Claude uses them. The access token check (requireMcpAuth) is Better Auth's and is
 * left out; the user arrives as `authInfo`, as the route passes it. Skipped unless
 * TEST_DATABASE_URL is set (see src/lib/data.db.test.ts).
 */
const url = process.env.TEST_DATABASE_URL;

type JsonRpc = { result?: Record<string, unknown>; error?: { message: string } };

describe.skipIf(!url)("MCP server (Postgres)", () => {
  const userId = `mcp-${crypto.randomUUID()}`;
  let call: (method: string, params?: Record<string, unknown>) => Promise<JsonRpc>;

  const tool = async (name: string, args: Record<string, unknown> = {}) => {
    const { result } = await call("tools/call", { name, arguments: args });
    const content = result!.content as { text: string }[];
    return { isError: Boolean(result!.isError), text: content[0]!.text };
  };

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const { db } = await import("@/lib/db/client");
    const { user } = await import("@/lib/db/schema");
    const { saveXProfile } = await import("@/lib/profile/profile");
    const { createMcpHandler } = await import("@modelcontextprotocol/server");
    const { buildServer } = await import("./server");
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../../../drizzle", import.meta.url)),
    });
    await db.insert(user).values({ id: userId, name: "MCP test", email: `${userId}@example.com` });
    await saveXProfile(userId, "siaramzee", "Europe/Amsterdam");

    const handler = createMcpHandler(({ authInfo }) =>
      buildServer(String(authInfo?.extra?.userId)),
    );
    let nextId = 1;
    call = async (method, params = {}) => {
      const response = await handler.fetch(
        new Request("http://localhost:3000/mcp", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json, text/event-stream",
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
        }),
        { authInfo: { token: "", clientId: "test", scopes: [], extra: { userId } } },
      );
      const body = await response.text();
      // The stateless 2025 path may answer as a one-event SSE stream.
      const json =
        body.startsWith("event:") || body.startsWith("data:")
          ? body
              .split("\n")
              .find((l) => l.startsWith("data:"))!
              .slice(5)
          : body;
      return JSON.parse(json) as JsonRpc;
    };
  });

  afterAll(async () => {
    const { deleteAccount } = await import("@/lib/account/account");
    await deleteAccount(userId);
  });

  it("introduces itself with instructions, 18 tools and 6 prompts", async () => {
    const init = await call("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    expect(init.result!.instructions).toContain("get_briefing");
    const tools = (await call("tools/list")).result!.tools as { name: string }[];
    expect(tools.map((t) => t.name).sort()).toEqual([
      "decide",
      "get_backlinks",
      "get_briefing",
      "get_calendar",
      "get_history",
      "get_ideas",
      "get_stats",
      "plan_slots",
      "rate_idea",
      "record_metrics",
      "record_posts",
      "save_backlinks",
      "save_drafts",
      "save_ideas",
      "save_note",
      "save_review",
      "update_playbook",
      "update_profile",
    ]);
    const prompts = (await call("prompts/list")).result!.prompts as { name: string }[];
    expect(prompts.map((p) => p.name)).toEqual([
      "setup",
      "daily",
      "morning",
      "evening",
      "weekly",
      "backlinks",
    ]);
    const daily = (await call("prompts/get", { name: "daily" })).result!;
    expect(JSON.stringify(daily)).toContain("@siaramzee");
  });

  it("briefs Claude and takes drafts for today's slot", async () => {
    const briefing = JSON.parse((await tool("get_briefing", { mode: "morning" })).text);
    expect(briefing.profile.x_handle).toBe("siaramzee");
    expect(briefing.playbook.version).toBe(1);
    expect(briefing.routine.mode).toBe("morning");
    const slot = briefing.today[0];
    expect(slot).toMatchObject({ post_id: null, status: "planned" });

    const saved = await tool("save_drafts", {
      date: briefing.now.date,
      time: slot.time,
      drafts: [{ text: "Draft one", reason: "New type, no numbers yet" }, { text: "Draft two" }],
    });
    expect(saved.isError).toBe(false);
    const calendar = JSON.parse(
      (await tool("get_calendar", { from: briefing.now.date, to: briefing.now.date })).text,
    );
    expect(calendar.days[0].items[0]).toMatchObject({ status: "drafted", time: slot.time });
    expect(calendar.days[0].items[0].drafts.map((d: { text: string }) => d.text)).toEqual([
      "Draft one",
      "Draft two",
    ]);
  });

  it("answers mistakes with a sentence Claude can act on", async () => {
    const bad = await tool("save_drafts", { post_id: "nope", drafts: [{ text: "x" }] });
    expect(bad).toEqual({ isError: true, text: "There is no post with id nope." });
    const range = await tool("get_calendar", { from: "2026-01-01", to: "2026-06-01" });
    expect(range).toEqual({ isError: true, text: "Ask for 62 days or fewer at a time." });
    const invalid = await call("tools/call", {
      name: "plan_slots",
      arguments: { slots: [{ date: "2026-13-01", time: "25:00" }] },
    });
    expect(JSON.stringify(invalid)).toContain("Use a date like 2026-10-30");
  });

  it("validates a playbook before saving a new version", async () => {
    const { DEFAULT_PLAYBOOK } = await import("@/lib/playbook/default");
    const week = {
      ...DEFAULT_PLAYBOOK.week,
      sat: [],
      sun: [{ time: "10:00", topic: "Weekly recap" }],
    };
    const saved = await tool("update_playbook", {
      playbook: { ...DEFAULT_PLAYBOOK, week, goal: { followers: 1000, by: "2027-10-30" } },
      summary: "Weekends lighter",
    });
    expect(JSON.parse(saved.text)).toEqual({ version: 2 });
    const history = JSON.parse((await tool("get_history", { kind: "playbook" })).text);
    expect(history.map((p: { version: number }) => p.version)).toEqual([2, 1]);
  });

  it("lists a website's backlink places, adds new ones and ticks one the user submitted", async () => {
    expect(await tool("get_backlinks")).toMatchObject({
      isError: true,
      text: expect.stringContaining("ask the user to add theirs on the Backlinks page"),
    });
    const { addWebsite } = await import("@/lib/backlinks/backlinks");
    await addWebsite(userId, "simpledash.com");
    await addWebsite(userId, "myloopland.com");
    expect(await tool("get_backlinks")).toEqual({
      isError: true,
      text: "Say which website with `website`: simpledash.com, myloopland.com.",
    });

    const before = JSON.parse((await tool("get_backlinks", { website: "simpledash.com" })).text);
    expect(before.website).toBe("https://simpledash.com");
    expect(before.websites).toEqual(["https://simpledash.com", "https://myloopland.com"]);
    expect(before.submitted).toBe(0);
    expect(before.steps).toContain("save_backlinks");
    expect(before.places[0]).toMatchObject({
      name: "Product Hunt",
      category: "launch",
      submitted: false,
      added_by: "starter",
    });

    const devhunt = before.places.find((p: { name: string }) => p.name === "DevHunt");
    const saved = await tool("save_backlinks", {
      website: "https://www.simpledash.com/",
      add: [
        { name: "Again", url: "https://www.devhunt.org/", category: "launch" },
        {
          name: "Awesome Analytics",
          url: "https://github.com/example/awesome-analytics",
          category: "directory",
          cost: "Free (pull request)",
        },
      ],
      update: [{ id: devhunt.id, submitted: true }],
    });
    expect(saved.isError).toBe(false);
    const result = JSON.parse(saved.text);
    expect(result.website).toBe("https://simpledash.com");
    expect(result.added.map((p: { name: string }) => p.name)).toEqual(["Awesome Analytics"]);
    expect(result.skipped[0].reason).toBe("already listed as DevHunt");

    const after = JSON.parse((await tool("get_backlinks", { website: "simpledash.com" })).text);
    expect(after.submitted).toBe(1);
    expect(after.total).toBe(before.total + 1);
    expect(after.places.at(-1)).toMatchObject({ name: "Awesome Analytics", added_by: "claude" });
    // The other website's list didn't change.
    const other = JSON.parse((await tool("get_backlinks", { website: "myloopland.com" })).text);
    expect(other).toMatchObject({ submitted: 0, total: before.total });

    expect(await tool("save_backlinks", {})).toEqual({
      isError: true,
      text: "Send at least one place to add or update.",
    });
    const notWeb = await call("tools/call", {
      name: "save_backlinks",
      arguments: { add: [{ name: "x", url: "ftp://example.com", category: "directory" }] },
    });
    expect(JSON.stringify(notWeb)).toContain("Use a web address starting with https://");
  });

  it("saves ideas with Claude's and Codex's ratings, skips repeats, lists and rates them", async () => {
    const empty = JSON.parse((await tool("get_ideas")).text);
    expect(empty).toEqual({ total: 0, published: 0, matching: 0, ideas: [] });

    const saved = await tool("save_ideas", {
      ideas: [
        {
          title: "Building in public, week 1",
          description: "What I shipped and what broke",
          details: "Thread of 4 posts; screenshots",
          rating: 8,
        },
        { title: "Why I price by seat", description: "The maths behind it", rating: 6 },
      ],
    });
    expect(saved.isError).toBe(false);
    const first = JSON.parse(saved.text);
    expect(first.saved).toHaveLength(2);
    expect(first.skipped).toEqual([]);

    const fromCodex = JSON.parse(
      (
        await tool("save_ideas", {
          source: "codex",
          ideas: [
            { title: "building in public — week 1!", description: "Same again", rating: 9 },
            { title: "A support inbox at zero", description: "How I keep it there", rating: 7 },
          ],
        })
      ).text,
    );
    expect(fromCodex.saved.map((i: { title: string }) => i.title)).toEqual([
      "A support inbox at zero",
    ]);
    expect(fromCodex.skipped[0]).toMatchObject({
      title: "building in public — week 1!",
      reason: "too close to “Building in public, week 1”",
    });

    const listed = JSON.parse((await tool("get_ideas")).text);
    expect(listed).toMatchObject({ total: 3, published: 0, matching: 3 });
    expect(listed.ideas.map((i: { title: string }) => i.title)).toEqual([
      "A support inbox at zero",
      "Building in public, week 1",
      "Why I price by seat",
    ]);
    const [inbox, building, pricing] = listed.ideas;
    expect(inbox).toMatchObject({
      source: "codex",
      claude_rating: null,
      codex_rating: 7,
      my_rating: null,
      published: false,
      details: null,
    });
    expect(building).toMatchObject({
      source: "claude",
      claude_rating: 8,
      codex_rating: null,
      details: "Thread of 4 posts; screenshots",
      added_on: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });

    const rated = await tool("rate_idea", { idea_id: pricing.idea_id, rater: "codex", rating: 9 });
    expect(rated.isError).toBe(false);
    expect(JSON.parse(rated.text)).toMatchObject({
      rated: true,
      idea: { idea_id: pricing.idea_id, claude_rating: 6, codex_rating: 9 },
    });
    // Claude re-rates its own old idea, and rates the one Codex added; Codex's ratings stay.
    const rerated = await tool("rate_idea", {
      idea_id: pricing.idea_id,
      rater: "claude",
      rating: 3,
    });
    expect(JSON.parse(rerated.text).idea).toMatchObject({ claude_rating: 3, codex_rating: 9 });
    const fromClaude = await tool("rate_idea", {
      idea_id: inbox.idea_id,
      rater: "claude",
      rating: 5,
    });
    expect(JSON.parse(fromClaude.text).idea).toMatchObject({
      source: "codex",
      claude_rating: 5,
      codex_rating: 7,
      my_rating: null,
    });

    const byCodex = JSON.parse((await tool("get_ideas", { sort: "codex", limit: 2 })).text);
    expect(byCodex.matching).toBe(3);
    expect(byCodex.ideas.map((i: { idea_id: string }) => i.idea_id)).toEqual([
      pricing.idea_id,
      inbox.idea_id,
    ]);

    const { setIdeaPublished } = await import("@/lib/ideas/ideas");
    await setIdeaPublished(userId, building.idea_id, true);
    const unpublished = JSON.parse((await tool("get_ideas", { published: false })).text);
    expect(unpublished).toMatchObject({ total: 3, published: 1, matching: 2 });
    const done = JSON.parse((await tool("get_ideas", { published: true })).text);
    expect(done.ideas.map((i: { idea_id: string }) => i.idea_id)).toEqual([building.idea_id]);

    expect(await tool("rate_idea", { idea_id: "nope", rater: "claude", rating: 5 })).toEqual({
      isError: true,
      text: "There is no idea with id nope.",
    });
    for (const rating of [0, 11, 7.5]) {
      const bad = await call("tools/call", {
        name: "rate_idea",
        arguments: { idea_id: pricing.idea_id, rater: "codex", rating },
      });
      expect(JSON.stringify(bad), String(rating)).toContain("isError");
    }
    // Who is rating must be said, and the user's own rating can't be set through the tools.
    for (const args of [{}, { rater: "my" }, { rater: "user" }]) {
      const refused = await call("tools/call", {
        name: "rate_idea",
        arguments: { idea_id: pricing.idea_id, rating: 1, ...args },
      });
      expect(JSON.stringify(refused), JSON.stringify(args)).toContain("isError");
    }
    const noRating = await call("tools/call", {
      name: "save_ideas",
      arguments: { ideas: [{ title: "No rating", description: "x" }] },
    });
    expect(JSON.stringify(noRating)).toContain("isError");
    const badSource = await call("tools/call", {
      name: "save_ideas",
      arguments: { source: "gpt", ideas: [{ title: "x", description: "x", rating: 5 }] },
    });
    expect(JSON.stringify(badSource)).toContain("isError");
    // None of the refused calls changed anything.
    const after = JSON.parse((await tool("get_ideas")).text);
    expect(after.total).toBe(3);
    expect(
      after.ideas.find((i: { idea_id: string }) => i.idea_id === pricing.idea_id),
    ).toMatchObject({ claude_rating: 3, codex_rating: 9, my_rating: null });
  });
});
