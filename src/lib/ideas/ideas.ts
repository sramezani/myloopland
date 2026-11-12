import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { idea, type Idea, type IdeaSource } from "@/lib/db/schema";
import { UserFacingError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { findNearDuplicate } from "./similar";
import { isRating, sortIdeas, type IdeaItem, type IdeaSort } from "./summary";

/**
 * Post ideas (docs/SPEC.md section 13): Claude or Codex saves and rates them, Codex rates
 * Claude's, and the user rates them and ticks the ones they published, on the page.
 */

/** Plenty for years of ideas, and keeps get_ideas small. */
export const MAX_IDEAS = 1000;

const columns = {
  id: idea.id,
  title: idea.title,
  description: idea.description,
  details: idea.details,
  claudeRating: idea.claudeRating,
  codexRating: idea.codexRating,
  myRating: idea.myRating,
  published: idea.published,
  source: idea.source,
  createdAt: idea.createdAt,
};

function toItem(row: Pick<Idea, keyof typeof columns>): IdeaItem {
  return { ...row, createdAt: row.createdAt.toISOString() };
}

/**
 * The user's ideas, sorted (newest first by default). `published` keeps only the published
 * (true) or unpublished (false) ones.
 */
export async function listIdeas(
  userId: string,
  options: { published?: boolean; sort?: IdeaSort } = {},
): Promise<IdeaItem[]> {
  const rows = await db
    .select(columns)
    .from(idea)
    .where(
      and(
        eq(idea.userId, userId),
        options.published === undefined ? undefined : eq(idea.published, options.published),
      ),
    )
    .orderBy(desc(idea.createdAt));
  return sortIdeas(rows.map(toItem), options.sort);
}

export type NewIdea = {
  title: string;
  description: string;
  details?: string | null;
  /** The saver's own rating, 1 to 10. */
  rating: number;
};

/**
 * Saves new ideas from Claude or Codex. Each one's rating goes in the saver's column. A title
 * nearly the same as a listed one, or one earlier in the same call, is skipped and named back.
 */
export async function saveIdeas(userId: string, source: IdeaSource, ideas: NewIdea[]) {
  const bad = ideas.find((each) => !isRating(each.rating));
  if (bad) throw new UserFacingError(`Rate “${bad.title}” with a whole number from 1 to 10.`);

  const listed = await db
    .select({ id: idea.id, title: idea.title })
    .from(idea)
    .where(eq(idea.userId, userId));
  const known = [...listed];
  const saved: { id: string; title: string }[] = [];
  const skipped: { title: string; reason: string; idea_id: string }[] = [];
  const rows: (typeof idea.$inferInsert)[] = [];
  // Newest first would turn a call's ideas upside down, so each one is a millisecond older than
  // the one before: they show in the order they were sent (usually best first).
  const now = Date.now();

  for (const each of ideas) {
    const same = findNearDuplicate(each.title, known);
    if (same) {
      skipped.push({ title: each.title, reason: `too close to “${same.title}”`, idea_id: same.id });
      continue;
    }
    const id = newId();
    rows.push({
      id,
      userId,
      title: each.title,
      description: each.description,
      details: each.details?.trim() ? each.details : null,
      claudeRating: source === "claude" ? each.rating : null,
      codexRating: source === "codex" ? each.rating : null,
      source,
      createdAt: new Date(now - rows.length),
    });
    known.push({ id, title: each.title });
    saved.push({ id, title: each.title });
  }

  if (listed.length + rows.length > MAX_IDEAS) {
    throw new UserFacingError(
      `The Ideas list holds up to ${MAX_IDEAS.toLocaleString("en")} ideas and has ${listed.length}: ask the user which old ones to drop before adding more.`,
    );
  }
  if (rows.length > 0) await db.insert(idea).values(rows);
  return { saved, skipped, total: known.length };
}

/** Changes one of the user's ideas, or says there's no such idea. */
async function change(
  userId: string,
  id: string,
  set: Partial<Pick<Idea, "codexRating" | "myRating" | "published">>,
) {
  const [row] = await db
    .update(idea)
    .set(set)
    .where(and(eq(idea.id, id), eq(idea.userId, userId)))
    .returning(columns);
  if (!row) throw new UserFacingError(`There is no idea with id ${id}.`);
  return toItem(row);
}

/** Codex's rating on an idea already listed. Rating again replaces it. */
export async function rateIdea(userId: string, id: string, rating: number): Promise<IdeaItem> {
  if (!isRating(rating)) throw new UserFacingError("Rate with a whole number from 1 to 10.");
  return change(userId, id, { codexRating: rating });
}

/** The user's own rating, from the page; null clears it. */
export async function setMyRating(userId: string, id: string, rating: number | null) {
  if (rating !== null && !isRating(rating)) {
    throw new UserFacingError("Rate with a whole number from 1 to 10.");
  }
  return change(userId, id, { myRating: rating });
}

/** The user's published tick, from the page. */
export async function setIdeaPublished(userId: string, id: string, published: boolean) {
  return change(userId, id, { published });
}

/** How many ideas the user has, and how many are published. */
export async function countIdeas(userId: string) {
  const rows = await db
    .select({ published: idea.published, total: count() })
    .from(idea)
    .where(eq(idea.userId, userId))
    .groupBy(idea.published);
  const total = rows.reduce((sum, row) => sum + row.total, 0);
  return { total, published: rows.find((row) => row.published)?.total ?? 0 };
}
