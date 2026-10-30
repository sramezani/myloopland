import "server-only";
import { and, desc, eq, inArray, max } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decision, playbook } from "@/lib/db/schema";
import { newId } from "@/lib/ids";
import { DEFAULT_PLAYBOOK, DEFAULT_PLAYBOOK_SUMMARY } from "./default";
import { playbookSchema, type Playbook } from "./schema";

export type ActivePlaybook = {
  version: number;
  content: Playbook;
  summary: string;
  createdAt: Date;
};

/** The user's newest playbook version, or null before they added their X profile. */
export async function getActivePlaybook(userId: string): Promise<ActivePlaybook | null> {
  const [row] = await db
    .select()
    .from(playbook)
    .where(eq(playbook.userId, userId))
    .orderBy(desc(playbook.version))
    .limit(1);
  if (!row) return null;
  // Stored content passed the schema when it was saved; parsing again keeps old rows working
  // if the schema gains a field with a default.
  return {
    version: row.version,
    content: playbookSchema.parse(row.content),
    summary: row.summary,
    createdAt: row.createdAt,
  };
}

/** Saves playbook v1 (the default) when the user has none yet. */
export async function ensurePlaybook(userId: string): Promise<ActivePlaybook> {
  const active = await getActivePlaybook(userId);
  if (active) return active;
  await db
    .insert(playbook)
    .values({
      id: newId(),
      userId,
      version: 1,
      content: DEFAULT_PLAYBOOK,
      summary: DEFAULT_PLAYBOOK_SUMMARY,
    })
    .onConflictDoNothing();
  return (await getActivePlaybook(userId))!;
}

/**
 * Saves a new playbook version and marks the listed pending decisions as approved by it.
 * Returns the new version number.
 */
export async function savePlaybook(
  userId: string,
  content: Playbook,
  summary: string,
  decisionIds: string[] = [],
): Promise<number> {
  return db.transaction(async (tx) => {
    const [{ latest } = { latest: 0 }] = await tx
      .select({ latest: max(playbook.version) })
      .from(playbook)
      .where(eq(playbook.userId, userId));
    const version = (latest ?? 0) + 1;
    await tx.insert(playbook).values({ id: newId(), userId, version, content, summary });
    if (decisionIds.length > 0) {
      await tx
        .update(decision)
        .set({ status: "approved", decidedAt: new Date(), playbookVersion: version })
        .where(
          and(
            eq(decision.userId, userId),
            inArray(decision.id, decisionIds),
            eq(decision.status, "pending"),
          ),
        );
    }
    return version;
  });
}

/** Older versions, newest first, for Claude to look back at. */
export async function listPlaybooks(userId: string, limit = 10) {
  return db
    .select({
      version: playbook.version,
      summary: playbook.summary,
      createdAt: playbook.createdAt,
      content: playbook.content,
    })
    .from(playbook)
    .where(eq(playbook.userId, userId))
    .orderBy(desc(playbook.version))
    .limit(limit);
}
