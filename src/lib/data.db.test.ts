import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

/**
 * The data layer against a real Postgres, end to end: profile, plan, drafts, posting,
 * numbers, stats, review and delete. Skipped unless TEST_DATABASE_URL points at an empty
 * database it may write to:
 *   TEST_DATABASE_URL=postgres://myloopland:myloopland@localhost:5433/myloopland_test npm test
 */
const url = process.env.TEST_DATABASE_URL;

describe.skipIf(!url)("data layer (Postgres)", () => {
  const userId = `test-${crypto.randomUUID()}`;
  const tz = "Europe/Amsterdam";
  // A fixed "now": Friday 30 October 2026, 20:00 in Amsterdam.
  const now = new Date("2026-10-30T19:00:00Z");

  beforeAll(async () => {
    process.env.DATABASE_URL = url;
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    const { db } = await import("@/lib/db/client");
    const { user } = await import("@/lib/db/schema");
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL("../../drizzle", import.meta.url)),
    });
    await db.insert(user).values({ id: userId, name: "Test", email: `${userId}@example.com` });
  });

  afterAll(async () => {
    const { deleteAccount } = await import("@/lib/account/account");
    await deleteAccount(userId);
  });

  it("starts with the default plan once the X profile is saved", async () => {
    const { saveXProfile, getProfile } = await import("@/lib/profile/profile");
    const { getCalendar } = await import("@/lib/calendar/queries");
    await saveXProfile(userId, "siaramzee", tz);
    expect(await getProfile(userId)).toMatchObject({ xHandle: "siaramzee", timeZone: tz });
    const { today, days } = await getCalendar(userId, tz, "2026-10-30", "2026-10-31", now);
    expect(today).toBe("2026-10-30");
    expect(days.map((d) => d.items.length)).toEqual([2, 2]);
    expect(days[0]!.items[0]).toMatchObject({ fromPlaybook: true, time: "12:30" });
  });

  it("asks, drafts, records the post and its numbers", async () => {
    const { planSlots, saveDrafts, recordPosts, recordMetrics } = await import("@/lib/posts/posts");
    const { saveNote } = await import("@/lib/notes/notes");
    const { getCalendar } = await import("@/lib/calendar/queries");

    const [asked] = await planSlots(userId, [
      { date: "2026-10-30", time: "12:30", question: "Useful or hype?" },
    ]);
    expect(asked).toMatchObject({ result: "needs_input" });

    const { noteId } = await saveNote(userId, {
      kind: "take",
      text: "Overhyped",
      postId: asked!.postId!,
    });
    const saved = await saveDrafts(userId, { date: "2026-10-30", time: "12:30" }, [
      { text: "Option one", reason: "Takes did well", noteIds: [noteId] },
      { text: "Option two" },
    ]);
    expect(saved.drafts.map((d) => d.position)).toEqual([1, 2]);

    const [posted] = await recordPosts(userId, tz, "siaramzee", [
      {
        xUrl: "https://x.com/siaramzee/status/111?s=20",
        postedAt: "2026-10-30T11:41:00Z",
        text: "Option  two",
        slot: { date: "2026-10-30", time: "12:30" },
      },
      {
        xUrl: "https://x.com/siaramzee/status/222",
        postedAt: "2026-10-30T18:10:00Z",
        text: "A quote",
        kind: "quote",
      },
    ]);
    expect(posted).toMatchObject({
      matched: "slot",
      edited: false,
      xUrl: "https://x.com/siaramzee/status/111",
    });

    // Sending the same post again updates it.
    const [again] = await recordPosts(userId, tz, "siaramzee", [
      {
        xUrl: "https://x.com/siaramzee/status/111",
        postedAt: "2026-10-30T11:41:00Z",
        text: "Option two!",
      },
    ]);
    expect(again).toMatchObject({ matched: "existing", postId: posted!.postId });

    const metrics = await recordMetrics(
      userId,
      [
        { xUrl: "https://x.com/siaramzee/status/111", views: 120, likes: 4, newFollows: 2 },
        { xUrl: "https://x.com/siaramzee/status/222", views: 40 },
        { xUrl: "https://x.com/siaramzee/status/999", views: 1 },
      ],
      { followers: 243 },
      now,
    );
    expect(metrics).toEqual({
      snapshotsSaved: 2,
      followersSaved: true,
      unknownPosts: ["https://x.com/siaramzee/status/999"],
    });

    const { days } = await getCalendar(userId, tz, "2026-10-30", "2026-10-30", now);
    const items = days[0]!.items;
    expect(items.map((i) => [i.time, i.status, i.kind])).toEqual([
      ["12:30", "posted", "post"],
      ["19:00", "planned", "post"],
      ["19:10", "posted", "quote"],
    ]);
    expect(items[0]!.metrics).toMatchObject({ views: 120, likes: 4, newFollows: 2, replies: null });
    expect(items[0]!.drafts.find((d) => d.picked)?.text).toBe("Option two");
  });

  it("summarises what worked and where the account stands", async () => {
    const { getStats } = await import("@/lib/stats/stats");
    const { getProgress } = await import("@/lib/progress/progress");
    const stats = await getStats(userId, tz, "2026-10-01", "2026-10-31", "kind");
    expect(stats.posts).toBe(2);
    expect(stats.groups.map((g) => [g.key, g.medianViews])).toEqual([
      ["post", 120],
      ["quote", 40],
    ]);
    expect(stats.drafts).toEqual({
      slotsWithDrafts: 1,
      postedFromDraft: 1,
      editedBeforePosting: 1,
    });
    const progress = await getProgress(userId, tz, now);
    expect(progress).toMatchObject({
      followers: 243,
      change7d: null,
      last7: { posts: 2, medianViews: 80 },
    });
  });

  it("turns an approved suggestion into a new playbook version", async () => {
    const { saveReview, listDecisions, decide } = await import("@/lib/reviews/reviews");
    const { getActivePlaybook, savePlaybook } = await import("@/lib/playbook/playbook");
    const { reviewId, decisionIds } = await saveReview(userId, {
      periodStart: "2026-10-26",
      periodEnd: "2026-11-01",
      summary: "Takes beat lessons",
      findings: ["Takes: 120 median views"],
      suggestions: [
        { change: "Move the evening slot to 18:00", reason: "18:00 posts got more views" },
        { change: "Drop Saturday evening", reason: "Few views" },
      ],
    });
    expect(reviewId).toBeTruthy();
    const active = (await getActivePlaybook(userId))!;
    const version = await savePlaybook(
      userId,
      { ...active.content, goal: { followers: 1000, by: "2027-10-30" } },
      "Goal set",
      [decisionIds[0]!],
    );
    expect(version).toBe(2);
    await decide(userId, decisionIds[1]!, "skipped", "I like Saturdays");
    const decisions = await listDecisions(userId);
    expect(decisions.map((d) => [d.status, d.playbookVersion]).sort()).toEqual([
      ["approved", 2],
      ["skipped", null],
    ]);
    expect((await getActivePlaybook(userId))!.content.goal).toEqual({
      followers: 1000,
      by: "2027-10-30",
    });
  });

  it("gives each website its own backlinks list, ticks places and keeps each place once", async () => {
    const {
      addWebsite,
      findWebsite,
      listBacklinks,
      listWebsites,
      saveBacklinks,
      setBacklinkSubmitted,
    } = await import("@/lib/backlinks/backlinks");
    const { STARTER_PLACES } = await import("@/lib/backlinks/starter");
    const { db } = await import("@/lib/db/client");
    const { user } = await import("@/lib/db/schema");

    await expect(findWebsite(userId)).rejects.toThrow("no website on the backlinks list yet");
    await expect(addWebsite(userId, "not a website")).rejects.toThrow(
      "That doesn't look like a website.",
    );

    // The same website added twice at once (two tabs) is one website with one starter list.
    const [site, again] = await Promise.all([
      addWebsite(userId, "SimpleDash.com"),
      addWebsite(userId, "https://www.simpledash.com/"),
    ]);
    expect(again.id).toBe(site.id);
    expect(site).toMatchObject({ url: "https://simpledash.com", key: "simpledash.com" });
    expect(await findWebsite(userId)).toEqual(site);

    const first = await listBacklinks(userId, site.id);
    expect(first).toHaveLength(STARTER_PLACES.length);
    expect(first[0]).toMatchObject({ name: "Product Hunt", addedBy: "starter", submittedAt: null });

    const tool = await addWebsite(userId, "github.com/me/tool");
    expect((await listWebsites(userId)).map((each) => each.key)).toEqual([
      "simpledash.com",
      "github.com/me/tool",
    ]);
    await expect(findWebsite(userId)).rejects.toThrow(
      "Say which website with `website`: simpledash.com, github.com/me/tool.",
    );
    expect(await findWebsite(userId, "https://www.SimpleDash.com")).toEqual(site);
    await expect(findWebsite(userId, "elsewhere.com")).rejects.toThrow(
      "elsewhere.com isn't on the backlinks list.",
    );

    const saashub = first.find((p) => p.name === "SaaSHub")!;
    const ticked = await setBacklinkSubmitted(userId, saashub.id, true);
    expect(ticked).not.toBeNull();
    // Ticking again keeps the first date; unticking clears it.
    expect(await setBacklinkSubmitted(userId, saashub.id, true)).toBe(ticked);
    expect(await setBacklinkSubmitted(userId, saashub.id, false)).toBeNull();

    const saved = await saveBacklinks(userId, site.id, {
      add: [
        { name: "Dupe", url: "http://saashub.com/", category: "directory" },
        {
          name: "r/GoogleAnalytics",
          url: "https://www.reddit.com/r/GoogleAnalytics",
          category: "community",
          cost: "Free",
        },
      ],
      update: [{ id: saashub.id, note: "Listed with screenshots.", submitted: true }],
    });
    expect(saved.added.map((p) => p.name)).toEqual(["r/GoogleAnalytics"]);
    expect(saved.skipped).toEqual([
      { name: "Dupe", url: "http://saashub.com/", reason: "already listed as SaaSHub" },
    ]);
    expect(saved.total).toBe(STARTER_PLACES.length + 1);
    const list = await listBacklinks(userId, site.id);
    expect(list.at(-1)).toMatchObject({ name: "r/GoogleAnalytics", addedBy: "claude" });
    expect(list.find((p) => p.id === saashub.id)).toMatchObject({
      note: "Listed with screenshots.",
    });
    expect(list.find((p) => p.id === saashub.id)!.submittedAt).not.toBeNull();

    // The other website's list is its own: nothing added, nothing ticked.
    const toolList = await listBacklinks(userId, tool.id);
    expect(toolList).toHaveLength(STARTER_PLACES.length);
    expect(toolList.every((p) => p.submittedAt === null)).toBe(true);
    await expect(
      saveBacklinks(userId, site.id, { add: [], update: [{ id: toolList[0]!.id, note: "x" }] }),
    ).rejects.toThrow("There is no backlink place");

    // Another user's websites and ids are unknown here.
    const otherId = `other-${crypto.randomUUID()}`;
    await db.insert(user).values({ id: otherId, name: "Other", email: `${otherId}@example.com` });
    try {
      expect(await listBacklinks(otherId, site.id)).toEqual([]);
      await expect(setBacklinkSubmitted(otherId, saashub.id, true)).rejects.toThrow(
        `There is no backlink place with id ${saashub.id}.`,
      );
      await expect(
        saveBacklinks(otherId, site.id, { add: [], update: [{ id: saashub.id, submitted: true }] }),
      ).rejects.toThrow("There is no backlink place");
    } finally {
      const { deleteAccount } = await import("@/lib/account/account");
      await deleteAccount(otherId);
    }
  });

  it("deletes everything with the account", async () => {
    const { deleteAccount } = await import("@/lib/account/account");
    const { db } = await import("@/lib/db/client");
    const { backlink, post, playbook, website } = await import("@/lib/db/schema");
    const { eq } = await import("drizzle-orm");
    await deleteAccount(userId);
    expect(await db.select().from(post).where(eq(post.userId, userId))).toEqual([]);
    expect(await db.select().from(playbook).where(eq(playbook.userId, userId))).toEqual([]);
    expect(await db.select().from(backlink).where(eq(backlink.userId, userId))).toEqual([]);
    expect(await db.select().from(website).where(eq(website.userId, userId))).toEqual([]);
  });
});
