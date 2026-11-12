"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { UserFacingError } from "@/lib/errors";
import { setIdeaPublished, setMyRating } from "@/lib/ideas/ideas";
import { isRating } from "@/lib/ideas/summary";
import { reportError } from "@/lib/report-error";

export type IdeaResult = { ok: true } | { ok: false; error: string };

const RELOAD = "Couldn't save that. Reload the page and try again.";

function isIdeaId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 100;
}

/** Saves one change to an idea and says, in plain words, when it didn't work. */
async function save(what: string, write: () => Promise<unknown>): Promise<IdeaResult> {
  try {
    await write();
    revalidatePath("/dashboard/ideas");
    return { ok: true };
  } catch (error) {
    // The data layer's message names the id, for Claude; people get plain words.
    if (error instanceof UserFacingError) {
      return { ok: false, error: "This idea isn't on your list any more. Reload the page." };
    }
    reportError(`saving ${what} failed`, error);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
}

/** The user's own rating on an idea (docs/SPEC.md section 13): 1 to 10, or null to clear it. */
export async function setMyRatingAction(id: string, rating: number | null): Promise<IdeaResult> {
  const user = await requireUser();
  if (!isIdeaId(id) || (rating !== null && !isRating(rating))) return { ok: false, error: RELOAD };
  return save("an idea rating", () => setMyRating(user.id, id, rating));
}

/** The published tick on an idea (docs/SPEC.md section 13). */
export async function setIdeaPublishedAction(id: string, published: boolean): Promise<IdeaResult> {
  const user = await requireUser();
  if (!isIdeaId(id) || typeof published !== "boolean") return { ok: false, error: RELOAD };
  return save("an idea's published tick", () => setIdeaPublished(user.id, id, published));
}
