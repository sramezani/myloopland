import type { BacklinkCategory, BacklinkSource, LinkType } from "@/lib/db/schema";

/**
 * Backlink helpers shared by the page and the MCP tools (docs/SPEC.md section 12). Pure:
 * no database, so the client list can use them too.
 */

export const CATEGORY_ORDER: readonly BacklinkCategory[] = ["launch", "directory", "community"];

/** One of the user's websites. `key` is its address without scheme or www, used in the page's URL. */
export type WebsiteItem = { id: string; url: string; key: string };

/** A place as the page and the tools see it. Dates are ISO strings, so it can go to the browser. */
export type BacklinkItem = {
  id: string;
  name: string;
  url: string;
  category: BacklinkCategory;
  cost: string | null;
  note: string | null;
  linkType: LinkType | null;
  addedBy: BacklinkSource;
  createdAt: string;
  submittedAt: string | null;
};

export type BacklinkCounts = {
  total: number;
  submitted: number;
  byCategory: Record<BacklinkCategory, { total: number; submitted: number }>;
};

export function countBacklinks(items: readonly Pick<BacklinkItem, "category" | "submittedAt">[]) {
  const counts: BacklinkCounts = {
    total: 0,
    submitted: 0,
    byCategory: {
      launch: { total: 0, submitted: 0 },
      directory: { total: 0, submitted: 0 },
      community: { total: 0, submitted: 0 },
    },
  };
  for (const item of items) {
    const done = item.submittedAt !== null;
    counts.total++;
    counts.byCategory[item.category].total++;
    if (done) {
      counts.submitted++;
      counts.byCategory[item.category].submitted++;
    }
  }
  return counts;
}

/** How long a place Claude found counts as new. */
export const NEW_FOR_DAYS = 14;

/** A place Claude added in the last 14 days. */
export function isNewPlace(item: Pick<BacklinkItem, "addedBy" | "createdAt">, now: Date): boolean {
  if (item.addedBy !== "claude") return false;
  const age = now.getTime() - Date.parse(item.createdAt);
  return age >= 0 && age < NEW_FOR_DAYS * 24 * 60 * 60 * 1000;
}

/** Whether a place matches a search: every word appears in its name, address, note or cost. */
export function matchesSearch(
  item: Pick<BacklinkItem, "name" | "url" | "note" | "cost">,
  query: string,
): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = [item.name, item.url, item.note ?? "", item.cost ?? ""].join(" ").toLowerCase();
  return words.every((word) => haystack.includes(word));
}
