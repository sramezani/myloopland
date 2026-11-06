import "server-only";
import { and, asc, count, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  backlink,
  website,
  type Backlink,
  type BacklinkCategory,
  type LinkType,
} from "@/lib/db/schema";
import { UserFacingError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { STARTER_PLACES } from "./starter";
import type { BacklinkItem, WebsiteItem } from "./summary";
import { displayUrl, readWebsite, urlKey } from "./url";

/**
 * The user's websites, and for each one the places to submit it to (docs/SPEC.md section 12).
 * The user adds websites on the page; each starts with the starter list, and Claude adds more.
 */

/** Plenty for one person's products and open source. */
export const MAX_WEBSITES = 20;

export async function listWebsites(userId: string): Promise<WebsiteItem[]> {
  return db
    .select({ id: website.id, url: website.url, key: website.urlKey })
    .from(website)
    .where(eq(website.userId, userId))
    .orderBy(asc(website.createdAt), asc(website.id));
}

/**
 * Adds a website with its own copy of the starter list. A website that's already there is
 * returned as it is, so adding it twice just opens it.
 */
export async function addWebsite(userId: string, input: string): Promise<WebsiteItem> {
  const address = readWebsite(input);
  if (!address) {
    throw new UserFacingError("That doesn't look like a website. Try one like simpledash.com.");
  }
  const existing = (await listWebsites(userId)).find((site) => site.key === address.key);
  if (existing) return existing;
  const [added] = await db
    .select({ total: count() })
    .from(website)
    .where(eq(website.userId, userId));
  if ((added?.total ?? 0) >= MAX_WEBSITES) {
    throw new UserFacingError(`You can add up to ${MAX_WEBSITES} websites.`);
  }

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(website)
      .values({ id: newId(), userId, url: address.url, urlKey: address.key })
      // The same website added twice at once: the second one adds nothing.
      .onConflictDoNothing()
      .returning({ id: website.id, url: website.url, key: website.urlKey });
    if (!row) {
      const [same] = await tx
        .select({ id: website.id, url: website.url, key: website.urlKey })
        .from(website)
        .where(and(eq(website.userId, userId), eq(website.urlKey, address.key)));
      if (!same) throw new Error("A website was neither added nor found.");
      return same;
    }
    await tx.insert(backlink).values(
      STARTER_PLACES.map((place, position) => ({
        id: newId(),
        userId,
        websiteId: row.id,
        name: place.name,
        url: place.url,
        urlKey: urlKey(place.url)!,
        category: place.category,
        cost: place.cost,
        note: place.note,
        linkType: place.linkType ?? null,
        position,
        addedBy: "starter" as const,
      })),
    );
    return row;
  });
}

/**
 * Which website Claude means: the address it sent (eg "simpledash.com"), or the only one.
 * Names the user's websites when it's unclear, so Claude can ask.
 */
export async function findWebsite(userId: string, address?: string): Promise<WebsiteItem> {
  const sites = await listWebsites(userId);
  const names = sites.map((site) => displayUrl(site.url)).join(", ");
  const [only] = sites;
  if (!only) {
    throw new UserFacingError(
      "There's no website on the backlinks list yet: ask the user to add theirs on the Backlinks page in myloopland.",
    );
  }
  if (!address?.trim()) {
    if (sites.length === 1) return only;
    throw new UserFacingError(`Say which website with \`website\`: ${names}.`);
  }
  const key = readWebsite(address)?.key;
  const site = sites.find((each) => each.key === key);
  if (!site) {
    throw new UserFacingError(
      `${address} isn't on the backlinks list. The user's websites: ${names}. They can add it on the Backlinks page.`,
    );
  }
  return site;
}

const columns = {
  id: backlink.id,
  name: backlink.name,
  url: backlink.url,
  urlKey: backlink.urlKey,
  category: backlink.category,
  cost: backlink.cost,
  note: backlink.note,
  linkType: backlink.linkType,
  addedBy: backlink.addedBy,
  createdAt: backlink.createdAt,
  submittedAt: backlink.submittedAt,
};

type Row = Pick<Backlink, keyof typeof columns>;

function toItem({ urlKey: _key, ...row }: Row): BacklinkItem {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    submittedAt: row.submittedAt?.toISOString() ?? null,
  };
}

async function rows(userId: string, websiteId: string): Promise<Row[]> {
  return db
    .select(columns)
    .from(backlink)
    .where(and(eq(backlink.userId, userId), eq(backlink.websiteId, websiteId)))
    .orderBy(asc(backlink.position));
}

/** One website's list, in order. Empty for a website that isn't the user's. */
export async function listBacklinks(userId: string, websiteId: string): Promise<BacklinkItem[]> {
  return (await rows(userId, websiteId)).map(toItem);
}

/** Ticks a place as submitted (keeping the first date) or back to do. Returns the new date. */
export async function setBacklinkSubmitted(
  userId: string,
  id: string,
  submitted: boolean,
): Promise<string | null> {
  const [row] = await db
    .update(backlink)
    .set({ submittedAt: submitted ? sql`coalesce(${backlink.submittedAt}, now())` : null })
    .where(and(eq(backlink.id, id), eq(backlink.userId, userId)))
    .returning({ submittedAt: backlink.submittedAt });
  if (!row) throw new UserFacingError(`There is no backlink place with id ${id}.`);
  return row.submittedAt?.toISOString() ?? null;
}

export type NewPlace = {
  name: string;
  url: string;
  category: BacklinkCategory;
  cost?: string | null;
  note?: string | null;
  linkType?: LinkType | null;
};

export type PlaceChange = {
  id: string;
  name?: string;
  url?: string;
  category?: BacklinkCategory;
  cost?: string | null;
  note?: string | null;
  linkType?: LinkType | null;
  submitted?: boolean;
};

/**
 * Claude's writes to one website's list: new places (added at the end) and changes to listed
 * ones. A new place whose address is already listed is reported back, not added.
 */
export async function saveBacklinks(
  userId: string,
  websiteId: string,
  input: { add: NewPlace[]; update: PlaceChange[] },
) {
  const listed = await rows(userId, websiteId);
  const byKey = new Map(listed.map((row) => [row.urlKey, row]));
  const byId = new Map(listed.map((row) => [row.id, row]));
  const added: { id: string; name: string }[] = [];
  const updated: { id: string; name: string }[] = [];
  const skipped: { name: string; url: string; reason: string }[] = [];

  for (const change of input.update) {
    const row = byId.get(change.id);
    if (!row) {
      throw new UserFacingError(`There is no backlink place with id ${change.id} on this list.`);
    }
    let key: string | undefined;
    if (change.url !== undefined) {
      key = urlKey(change.url) ?? undefined;
      if (!key) throw new UserFacingError(`${change.url} isn't a web address.`);
      const other = byKey.get(key);
      if (other && other.id !== row.id) {
        throw new UserFacingError(`${change.url} is already listed as ${other.name}.`);
      }
    }
    const { id: _id, ...fields } = change;
    if (Object.values(fields).every((value) => value === undefined)) {
      throw new UserFacingError(`Nothing to change for ${row.name}.`);
    }
    await db
      .update(backlink)
      .set({
        name: change.name,
        url: change.url,
        urlKey: key,
        category: change.category,
        cost: change.cost,
        note: change.note,
        linkType: change.linkType,
        submittedAt:
          change.submitted === undefined
            ? undefined
            : change.submitted
              ? sql`coalesce(${backlink.submittedAt}, now())`
              : null,
      })
      .where(and(eq(backlink.id, row.id), eq(backlink.userId, userId)));
    if (key) {
      byKey.delete(row.urlKey);
      byKey.set(key, { ...row, urlKey: key });
    }
    updated.push({ id: row.id, name: change.name ?? row.name });
  }

  let position = listed.length;
  for (const place of input.add) {
    const key = urlKey(place.url);
    if (!key) {
      skipped.push({ name: place.name, url: place.url, reason: "not a web address" });
      continue;
    }
    const same = byKey.get(key);
    if (same) {
      skipped.push({ name: place.name, url: place.url, reason: `already listed as ${same.name}` });
      continue;
    }
    const id = newId();
    const values = {
      id,
      userId,
      websiteId,
      name: place.name,
      url: place.url,
      urlKey: key,
      category: place.category,
      cost: place.cost ?? null,
      note: place.note ?? null,
      linkType: place.linkType ?? null,
      position: position++,
      addedBy: "claude" as const,
    };
    await db.insert(backlink).values(values);
    byKey.set(key, { ...values, createdAt: new Date(), submittedAt: null });
    added.push({ id, name: place.name });
  }

  return { added, updated, skipped, total: byKey.size };
}
