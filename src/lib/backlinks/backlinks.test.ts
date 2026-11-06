import { describe, expect, it } from "vitest";
import { BACKLINK_CATEGORIES, LINK_TYPES } from "@/lib/db/schema";
import { STARTER_PLACES } from "./starter";
import { countBacklinks, isNewPlace, matchesSearch, type BacklinkItem } from "./summary";
import { displayUrl, readWebsite, urlKey } from "./url";

describe("urlKey", () => {
  it("treats addresses that differ only in scheme, www, case, query, hash or a slash as one", () => {
    expect(urlKey("https://www.Uneed.best/submit/?ref=x#top")).toBe("uneed.best/submit");
    expect(urlKey("http://uneed.best/submit")).toBe("uneed.best/submit");
    expect(urlKey("https://www.producthunt.com/")).toBe("producthunt.com");
  });

  it("keeps different pages of one site apart", () => {
    expect(urlKey("https://www.reddit.com/r/SaaS")).not.toBe(
      urlKey("https://www.reddit.com/r/SideProject"),
    );
  });

  it("refuses what isn't a web address", () => {
    expect(urlKey("saashub.com")).toBeNull();
    expect(urlKey("mailto:hi@example.com")).toBeNull();
    expect(urlKey("javascript:alert(1)")).toBeNull();
  });
});

describe("displayUrl", () => {
  it("shows the host and path without scheme, www or slash, keeping the case", () => {
    expect(displayUrl("https://www.reddit.com/r/SideProject/")).toBe("reddit.com/r/SideProject");
    expect(displayUrl("https://devhunt.org")).toBe("devhunt.org");
  });
});

describe("readWebsite", () => {
  it("reads a website however it's typed, adding https:// when missing", () => {
    expect(readWebsite(" SimpleDash.com ")).toEqual({
      url: "https://simpledash.com",
      key: "simpledash.com",
    });
    expect(readWebsite("https://www.simpledash.com/?ref=x#top")).toEqual({
      url: "https://www.simpledash.com",
      key: "simpledash.com",
    });
    expect(readWebsite("github.com/Me/tool/")).toEqual({
      url: "https://github.com/Me/tool",
      key: "github.com/me/tool",
    });
    expect(readWebsite("http://localhost.example:8080")?.url).toBe("http://localhost.example:8080");
  });

  it("refuses what isn't a website", () => {
    for (const input of [
      "",
      "simpledash",
      "not a website",
      "mailto:hi@example.com",
      "javascript:alert(1)",
      "ftp://example.com",
      "https://user:pass@example.com",
    ]) {
      expect(readWebsite(input), input).toBeNull();
    }
  });
});

describe("STARTER_PLACES", () => {
  it("lists each place once, with a web address, a category and a known link type", () => {
    const keys = STARTER_PLACES.map((place) => urlKey(place.url));
    expect(keys.every(Boolean)).toBe(true);
    expect(new Set(keys).size).toBe(STARTER_PLACES.length);
    for (const place of STARTER_PLACES) {
      expect(BACKLINK_CATEGORIES, place.name).toContain(place.category);
      if (place.linkType) expect(LINK_TYPES, place.name).toContain(place.linkType);
      expect(place.note?.length ?? 0, place.name).toBeLessThanOrEqual(300);
    }
  });

  it("has every category, launches first", () => {
    expect([...new Set(STARTER_PLACES.map((place) => place.category))]).toEqual([
      "launch",
      "directory",
      "community",
    ]);
  });
});

const item = (over: Partial<BacklinkItem>): BacklinkItem => ({
  id: "1",
  name: "SaaSHub",
  url: "https://www.saashub.com",
  category: "directory",
  cost: "Free",
  note: "A good long-term listing.",
  linkType: null,
  addedBy: "starter",
  createdAt: "2026-11-01T10:00:00Z",
  submittedAt: null,
  ...over,
});

describe("countBacklinks", () => {
  it("counts what's submitted, in all and per category", () => {
    const counts = countBacklinks([
      item({ category: "launch", submittedAt: "2026-11-02T10:00:00Z" }),
      item({ category: "launch" }),
      item({ category: "community", submittedAt: "2026-11-03T10:00:00Z" }),
    ]);
    expect(counts).toEqual({
      total: 3,
      submitted: 2,
      byCategory: {
        launch: { total: 2, submitted: 1 },
        directory: { total: 0, submitted: 0 },
        community: { total: 1, submitted: 1 },
      },
    });
  });
});

describe("isNewPlace", () => {
  const now = new Date("2026-11-05T12:00:00Z");

  it("marks places Claude added in the last 14 days", () => {
    expect(isNewPlace(item({ addedBy: "claude", createdAt: "2026-11-04T12:00:00Z" }), now)).toBe(
      true,
    );
    expect(isNewPlace(item({ addedBy: "claude", createdAt: "2026-10-20T12:00:00Z" }), now)).toBe(
      false,
    );
  });

  it("never marks the starter list", () => {
    expect(isNewPlace(item({ createdAt: "2026-11-05T11:00:00Z" }), now)).toBe(false);
  });
});

describe("matchesSearch", () => {
  it("finds every word in the name, address, note or cost, ignoring case", () => {
    const place = item({});
    expect(matchesSearch(place, "")).toBe(true);
    expect(matchesSearch(place, "saas")).toBe(true);
    expect(matchesSearch(place, "LONG free")).toBe(true);
    expect(matchesSearch(place, "saashub.com")).toBe(true);
    expect(matchesSearch(place, "reddit")).toBe(false);
  });
});
