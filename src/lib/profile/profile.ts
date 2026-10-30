import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { user } from "@/lib/db/schema";
import { isTimeZone } from "@/lib/dates";
import { ensurePlaybook } from "@/lib/playbook/playbook";

/**
 * Saves the X profile (the app's one input) and the browser's time zone, then makes sure the
 * user has a playbook, so the calendar shows the default plan straight away.
 */
export async function saveXProfile(userId: string, handle: string, timeZone: string | null) {
  await updateProfile(userId, { xHandle: handle, timeZone });
  await ensurePlaybook(userId);
}

/** Changes the X handle and/or time zone. An unknown time zone is ignored. */
export async function updateProfile(
  userId: string,
  changes: { xHandle?: string; timeZone?: string | null },
) {
  const set: { xHandle?: string; timeZone?: string } = {};
  if (changes.xHandle) set.xHandle = changes.xHandle;
  if (changes.timeZone && isTimeZone(changes.timeZone)) set.timeZone = changes.timeZone;
  if (Object.keys(set).length === 0) return;
  await db.update(user).set(set).where(eq(user.id, userId));
}

export async function getProfile(userId: string) {
  const [row] = await db
    .select({ name: user.name, xHandle: user.xHandle, timeZone: user.timeZone })
    .from(user)
    .where(eq(user.id, userId));
  return row ?? null;
}
