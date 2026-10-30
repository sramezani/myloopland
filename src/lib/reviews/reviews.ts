import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { decision, review, type DecisionStatus } from "@/lib/db/schema";
import { UserFacingError } from "@/lib/errors";
import { newId } from "@/lib/ids";

/** Saves a weekly review. Each suggestion becomes a pending decision for the user. */
export async function saveReview(
  userId: string,
  input: {
    periodStart: string;
    periodEnd: string;
    summary: string;
    findings: string[];
    suggestions: { change: string; reason: string }[];
  },
) {
  return db.transaction(async (tx) => {
    const reviewId = newId();
    await tx.insert(review).values({
      id: reviewId,
      userId,
      periodStart: input.periodStart,
      periodEnd: input.periodEnd,
      summary: input.summary,
      findings: input.findings,
    });
    const decisionIds = input.suggestions.map(() => newId());
    if (input.suggestions.length > 0) {
      await tx.insert(decision).values(
        input.suggestions.map((s, i) => ({
          id: decisionIds[i]!,
          userId,
          reviewId,
          change: s.change,
          reason: s.reason,
        })),
      );
    }
    return { reviewId, decisionIds };
  });
}

/** Records the user's answer to a suggestion. */
export async function decide(
  userId: string,
  decisionId: string,
  status: Exclude<DecisionStatus, "pending">,
  note?: string,
) {
  const updated = await db
    .update(decision)
    .set({ status, decidedAt: new Date(), note: note ?? null })
    .where(and(eq(decision.id, decisionId), eq(decision.userId, userId)))
    .returning({ id: decision.id });
  if (updated.length === 0)
    throw new UserFacingError(`There is no decision with id ${decisionId}.`);
  return { decisionId, status };
}

export async function listDecisions(
  userId: string,
  options: { status?: DecisionStatus; limit?: number } = {},
) {
  return db
    .select({
      id: decision.id,
      reviewId: decision.reviewId,
      change: decision.change,
      reason: decision.reason,
      status: decision.status,
      createdAt: decision.createdAt,
      decidedAt: decision.decidedAt,
      note: decision.note,
      playbookVersion: decision.playbookVersion,
    })
    .from(decision)
    .where(
      and(
        eq(decision.userId, userId),
        options.status ? eq(decision.status, options.status) : undefined,
      ),
    )
    .orderBy(desc(decision.createdAt))
    .limit(options.limit ?? 20);
}

export async function listReviews(userId: string, limit = 5) {
  return db
    .select({
      id: review.id,
      periodStart: review.periodStart,
      periodEnd: review.periodEnd,
      summary: review.summary,
      findings: review.findings,
      createdAt: review.createdAt,
    })
    .from(review)
    .where(eq(review.userId, userId))
    .orderBy(desc(review.createdAt))
    .limit(limit);
}
