import "server-only";
import { and, eq, inArray, isNull, max, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  accountStat,
  draft,
  note,
  post,
  postMetric,
  type Post,
  type PostKind,
} from "@/lib/db/schema";
import { localParts, weekdayOf } from "@/lib/dates";
import { UserFacingError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { getActivePlaybook } from "@/lib/playbook/playbook";
import { xPostId, xPostUrl } from "@/lib/x/x";

/**
 * Writes from Claude (docs/SPEC.md section 7): plans for a day, drafts, what was posted and
 * its numbers. Every query is scoped to the user; a post id from Claude is only used after
 * checking it is theirs.
 */

/** A slot, named by its stored post id or by its local day and time. */
export type SlotRef = { postId?: string; date?: string; time?: string };

const normalise = (text: string) => text.replace(/\s+/g, " ").trim();

async function findSlot(userId: string, date: string, time: string): Promise<Post | undefined> {
  const [row] = await db
    .select()
    .from(post)
    .where(and(eq(post.userId, userId), eq(post.date, date), eq(post.slotTime, time)));
  return row;
}

/** The stored row for a slot. A playbook slot gets a row the first time something happens. */
async function slotRow(userId: string, ref: SlotRef): Promise<Post> {
  if (ref.postId) {
    const [row] = await db
      .select()
      .from(post)
      .where(and(eq(post.id, ref.postId), eq(post.userId, userId)));
    if (!row) throw new UserFacingError(`There is no post with id ${ref.postId}.`);
    return row;
  }
  if (!ref.date || !ref.time) {
    throw new UserFacingError("Name the slot with post_id, or with both date and time.");
  }
  const existing = await findSlot(userId, ref.date, ref.time);
  if (existing) return existing;
  const active = await getActivePlaybook(userId);
  const planned = active?.content.week[weekdayOf(ref.date)].find((s) => s.time === ref.time);
  await db
    .insert(post)
    .values({
      id: newId(),
      userId,
      date: ref.date,
      slotTime: ref.time,
      status: "planned",
      topic: planned?.topic ?? null,
      pillar: planned?.pillar ?? null,
      series: planned?.series ?? null,
    })
    .onConflictDoNothing();
  return (await findSlot(userId, ref.date, ref.time))!;
}

export type SlotPlan = {
  date: string;
  time: string;
  status?: "planned" | "needs_input" | "skipped";
  topic?: string;
  pillar?: string | null;
  series?: string | null;
  question?: string | null;
  /** Remove the change: the slot follows the playbook again (or disappears if it isn't in it). */
  reset?: boolean;
};

/** Changes days of the plan: a topic, a question for the user, a new slot, a skip. */
export async function planSlots(userId: string, plans: SlotPlan[]) {
  const results: { date: string; time: string; result: string; postId: string | null }[] = [];
  for (const plan of plans) {
    if (plan.reset) {
      const removed = await db
        .delete(post)
        .where(
          and(
            eq(post.userId, userId),
            eq(post.date, plan.date),
            eq(post.slotTime, plan.time),
            ne(post.status, "posted"),
          ),
        )
        .returning({ id: post.id });
      const result = removed.length ? "back to the playbook" : "nothing to reset";
      results.push({ date: plan.date, time: plan.time, result, postId: null });
      continue;
    }
    const row = await slotRow(userId, { date: plan.date, time: plan.time });
    if (row.status === "posted") {
      results.push({ ...plan, result: "already posted, unchanged", postId: row.id });
      continue;
    }
    const question = plan.question === undefined ? row.question : plan.question;
    const status =
      plan.status ??
      (plan.question ? "needs_input" : row.status === "skipped" ? "planned" : row.status);
    await db
      .update(post)
      .set({
        status,
        question: status === "needs_input" ? question : null,
        ...(plan.topic !== undefined && { topic: plan.topic }),
        ...(plan.pillar !== undefined && { pillar: plan.pillar }),
        ...(plan.series !== undefined && { series: plan.series }),
      })
      .where(eq(post.id, row.id));
    results.push({ date: plan.date, time: plan.time, result: status, postId: row.id });
  }
  return results;
}

export type DraftInput = { text: string; reason?: string | null; noteIds?: string[] };

/**
 * Saves the options for a slot and marks it "Suggested". With `replace` (the default), drafts
 * the user hasn't posted are replaced; otherwise the new ones are added after them.
 */
export async function saveDrafts(
  userId: string,
  ref: SlotRef,
  drafts: DraftInput[],
  replace = true,
) {
  const row = await slotRow(userId, ref);
  if (row.status === "posted") {
    throw new UserFacingError("That slot is already posted, so its drafts can't change.");
  }
  const noteIds = [...new Set(drafts.flatMap((d) => d.noteIds ?? []))];
  const saved = await db.transaction(async (tx) => {
    if (replace) {
      await tx.delete(draft).where(and(eq(draft.postId, row.id), eq(draft.picked, false)));
    }
    const [{ last } = { last: 0 }] = await tx
      .select({ last: max(draft.position) })
      .from(draft)
      .where(eq(draft.postId, row.id));
    const start = last ?? 0;
    const inserted = await tx
      .insert(draft)
      .values(
        drafts.map((d, i) => ({
          id: newId(),
          postId: row.id,
          position: start + i + 1,
          text: d.text,
          reason: d.reason ?? null,
          noteIds: d.noteIds ?? [],
        })),
      )
      .returning({ id: draft.id, position: draft.position });
    await tx.update(post).set({ status: "drafted", question: null }).where(eq(post.id, row.id));
    if (noteIds.length > 0) {
      await tx
        .update(note)
        .set({ usedAt: new Date() })
        .where(and(eq(note.userId, userId), inArray(note.id, noteIds), isNull(note.usedAt)));
    }
    return inserted;
  });
  return { postId: row.id, date: row.date, time: row.slotTime, drafts: saved };
}

export type PostRecord = {
  xUrl: string;
  /** When it was posted, as an ISO date and time. */
  postedAt: string;
  /** The final text, as posted. */
  text: string;
  kind?: PostKind;
  /** The slot it was posted for, if any. */
  slot?: SlotRef;
  /** The draft it came from, if known. Otherwise a draft with the same text is found. */
  draftId?: string;
};

/**
 * Records what was really posted. The same post sent again is updated, not duplicated.
 * A post for a slot fills that slot; anything else is stored as an unplanned post.
 */
export async function recordPosts(
  userId: string,
  timeZone: string,
  handle: string | null,
  records: PostRecord[],
) {
  const results = [];
  for (const record of records) {
    const id = xPostId(record.xUrl);
    if (!id) {
      results.push({ xUrl: record.xUrl, error: "That isn't a link to an X post." });
      continue;
    }
    const postedAt = new Date(record.postedAt);
    if (Number.isNaN(postedAt.getTime())) {
      results.push({ xUrl: record.xUrl, error: "posted_at isn't a date and time." });
      continue;
    }
    const url = xPostUrl(handle, id);
    let matched: "existing" | "slot" | "unplanned" = "existing";
    let [row] = await db
      .select()
      .from(post)
      .where(and(eq(post.userId, userId), eq(post.xPostId, id)));
    if (!row && record.slot && (record.slot.postId || (record.slot.date && record.slot.time))) {
      const slot = await slotRow(userId, record.slot);
      // A slot holds one post: a second post for it is stored as unplanned.
      if (slot.status !== "posted") {
        row = slot;
        matched = "slot";
      }
    }
    if (!row) {
      const local = localParts(postedAt, timeZone);
      [row] = await db
        .insert(post)
        .values({ id: newId(), userId, date: local.date, slotTime: null, status: "posted" })
        .returning();
      matched = "unplanned";
    }
    await db
      .update(post)
      .set({
        status: "posted",
        xPostId: id,
        xUrl: url,
        postedAt,
        text: record.text,
        kind: record.kind ?? row!.kind,
      })
      .where(eq(post.id, row!.id));

    const drafts = await db.select().from(draft).where(eq(draft.postId, row!.id));
    const picked = record.draftId
      ? drafts.find((d) => d.id === record.draftId)
      : drafts.find((d) => normalise(d.text) === normalise(record.text));
    if (picked) {
      await db.update(draft).set({ picked: false }).where(eq(draft.postId, row!.id));
      await db.update(draft).set({ picked: true }).where(eq(draft.id, picked.id));
    }
    results.push({
      xUrl: url,
      postId: row!.id,
      matched,
      pickedDraftId: picked?.id ?? null,
      edited: picked ? normalise(picked.text) !== normalise(record.text) : null,
    });
  }
  return results;
}

export type MetricNumbers = {
  views?: number | null;
  likes?: number | null;
  replies?: number | null;
  reposts?: number | null;
  bookmarks?: number | null;
  shares?: number | null;
  profileVisits?: number | null;
  newFollows?: number | null;
  extra?: Record<string, number | string>;
};

export type MetricRecord = MetricNumbers & { xUrl?: string; postId?: string };

export type AccountNumbers = {
  followers: number;
  following?: number | null;
  postsCount?: number | null;
};

/**
 * Saves one snapshot of numbers per post (and the follower count). Posts must be recorded
 * first; unknown ones are reported back instead of guessed.
 */
export async function recordMetrics(
  userId: string,
  records: MetricRecord[],
  account?: AccountNumbers,
  capturedAt: Date = new Date(),
) {
  const xIds = [
    ...new Set(records.flatMap((r) => (r.xUrl && xPostId(r.xUrl) ? [xPostId(r.xUrl)!] : []))),
  ];
  const postIds = [...new Set(records.flatMap((r) => (r.postId ? [r.postId] : [])))];
  const [byXRows, byIdRows] = await Promise.all([
    xIds.length
      ? db
          .select({ id: post.id, xPostId: post.xPostId })
          .from(post)
          .where(and(eq(post.userId, userId), inArray(post.xPostId, xIds)))
      : [],
    postIds.length
      ? db
          .select({ id: post.id })
          .from(post)
          .where(and(eq(post.userId, userId), inArray(post.id, postIds)))
      : [],
  ]);
  const byXId = new Map(byXRows.map((p) => [p.xPostId, p.id]));
  const ownIds = new Set(byIdRows.map((p) => p.id));

  const unknown: string[] = [];
  const values = [];
  for (const record of records) {
    const xId = record.xUrl ? xPostId(record.xUrl) : null;
    const id =
      (xId && byXId.get(xId)) ||
      (record.postId && ownIds.has(record.postId) ? record.postId : null);
    if (!id) {
      unknown.push(record.xUrl ?? record.postId ?? "(no link)");
      continue;
    }
    values.push({
      id: newId(),
      postId: id,
      capturedAt,
      views: record.views ?? null,
      likes: record.likes ?? null,
      replies: record.replies ?? null,
      reposts: record.reposts ?? null,
      bookmarks: record.bookmarks ?? null,
      shares: record.shares ?? null,
      profileVisits: record.profileVisits ?? null,
      newFollows: record.newFollows ?? null,
      extra: record.extra ?? null,
    });
  }
  if (values.length > 0) await db.insert(postMetric).values(values);
  if (account) {
    await db.insert(accountStat).values({
      id: newId(),
      userId,
      capturedAt,
      followers: account.followers,
      following: account.following ?? null,
      postsCount: account.postsCount ?? null,
    });
  }
  return { snapshotsSaved: values.length, followersSaved: Boolean(account), unknownPosts: unknown };
}
