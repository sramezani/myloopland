import "server-only";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { oauthRefreshToken, user } from "@/lib/db/schema";

/** Deletes the user. Every table cascades from `user`, so all their data goes with it. */
export async function deleteAccount(userId: string) {
  await db.delete(user).where(eq(user.id, userId));
}

/** True once the user's Claude has connected and its connection hasn't ended. */
export async function isClaudeConnected(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: oauthRefreshToken.id })
    .from(oauthRefreshToken)
    .where(
      and(
        eq(oauthRefreshToken.userId, userId),
        isNull(oauthRefreshToken.revoked),
        gt(oauthRefreshToken.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return Boolean(row);
}
