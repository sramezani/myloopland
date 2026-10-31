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

  it("introduces itself with instructions, 13 tools and 5 prompts", async () => {
    const init = await call("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    expect(init.result!.instructions).toContain("get_briefing");
    const tools = (await call("tools/list")).result!.tools as { name: string }[];
    expect(tools.map((t) => t.name).sort()).toEqual([
      "decide",
      "get_briefing",
      "get_calendar",
      "get_history",
      "get_stats",
      "plan_slots",
      "record_metrics",
      "record_posts",
      "save_drafts",
      "save_note",
      "save_review",
      "update_playbook",
      "update_profile",
    ]);
    const prompts = (await call("prompts/list")).result!.prompts as { name: string }[];
    expect(prompts.map((p) => p.name)).toEqual(["setup", "daily", "morning", "evening", "weekly"]);
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
});
