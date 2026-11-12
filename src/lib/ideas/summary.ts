import type { IdeaSource } from "@/lib/db/schema";

/**
 * Idea helpers shared by the page and the MCP tools (docs/SPEC.md section 13). Pure: no
 * database, so the client table can use them too.
 */

export const RATING_MIN = 1;
export const RATING_MAX = 10;

/** What an idea list can be sorted by: when it was added, or one of the three ratings. */
export const IDEA_SORTS = ["created", "claude", "codex", "my"] as const;
export type IdeaSort = (typeof IDEA_SORTS)[number];
export type RatingKey = Exclude<IdeaSort, "created">;
export type SortDirection = "desc" | "asc";

/** An idea as the page and the tools see it. Dates are ISO strings, so it can go to the browser. */
export type IdeaItem = {
  id: string;
  title: string;
  description: string;
  details: string | null;
  claudeRating: number | null;
  codexRating: number | null;
  myRating: number | null;
  published: boolean;
  source: IdeaSource;
  createdAt: string;
};

/** A whole number from 1 to 10: the only ratings stored. */
export function isRating(value: unknown): value is number {
  return (
    Number.isInteger(value) && (value as number) >= RATING_MIN && (value as number) <= RATING_MAX
  );
}

const RATING_FIELD = {
  claude: "claudeRating",
  codex: "codexRating",
  my: "myRating",
} as const satisfies Record<RatingKey, keyof IdeaItem>;

export function ratingOf(item: Pick<IdeaItem, (typeof RATING_FIELD)[RatingKey]>, key: RatingKey) {
  return item[RATING_FIELD[key]];
}

type Sortable = Pick<IdeaItem, "id" | "createdAt" | "claudeRating" | "codexRating" | "myRating">;

/** Newest first; the same instant falls back to the id, so the order never wobbles. */
function newestFirst(a: Sortable, b: Sortable): number {
  return (
    Date.parse(b.createdAt) - Date.parse(a.createdAt) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0)
  );
}

/**
 * Sorts ideas without changing the list given. `created` is newest first ("asc": oldest first).
 * A rating is highest first ("asc": lowest first). Unrated ideas go last either way, since "—"
 * isn't a low score, and ties go newest first.
 */
export function sortIdeas<T extends Sortable>(
  items: readonly T[],
  sort: IdeaSort = "created",
  direction: SortDirection = "desc",
): T[] {
  const sign = direction === "desc" ? 1 : -1;
  if (sort === "created") return [...items].sort((a, b) => sign * newestFirst(a, b));
  return [...items].sort((a, b) => {
    const x = ratingOf(a, sort);
    const y = ratingOf(b, sort);
    if (x === null || y === null) {
      return x === y ? newestFirst(a, b) : x === null ? 1 : -1;
    }
    return sign * (y - x) || newestFirst(a, b);
  });
}
