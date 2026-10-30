import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { note, post, type NoteKind } from "@/lib/db/schema";
import { UserFacingError } from "@/lib/errors";
import { newId } from "@/lib/ids";

/** Saves something the user told Claude: the raw material for drafts. */
export async function saveNote(
  userId: string,
  input: { kind: NoteKind; text: string; postId?: string },
) {
  if (input.postId) {
    const [owned] = await db
      .select({ id: post.id })
      .from(post)
      .where(and(eq(post.id, input.postId), eq(post.userId, userId)));
    if (!owned) throw new UserFacingError(`There is no post with id ${input.postId}.`);
  }
  const id = newId();
  await db
    .insert(note)
    .values({ id, userId, kind: input.kind, text: input.text, postId: input.postId ?? null });
  return { noteId: id };
}

/** Notes, newest first. `unusedOnly`: those no draft was written from yet. */
export async function listNotes(
  userId: string,
  options: { unusedOnly?: boolean; limit?: number } = {},
) {
  return db
    .select({
      id: note.id,
      kind: note.kind,
      text: note.text,
      postId: note.postId,
      createdAt: note.createdAt,
      usedAt: note.usedAt,
    })
    .from(note)
    .where(and(eq(note.userId, userId), options.unusedOnly ? isNull(note.usedAt) : undefined))
    .orderBy(desc(note.createdAt))
    .limit(options.limit ?? 20);
}
