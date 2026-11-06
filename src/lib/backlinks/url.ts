/**
 * Addresses of backlink places (docs/SPEC.md section 12). Pure, so the list, the page and the
 * MCP tools agree on when two addresses are the same place.
 */

function parse(url: string): URL | null {
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * What makes a place unique on a list: "https://www.Uneed.best/submit/?ref=x#top" →
 * "uneed.best/submit". Null when it isn't a web address.
 */
export function urlKey(url: string): string | null {
  const parsed = parse(url);
  if (!parsed) return null;
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const path = parsed.pathname.replace(/\/+$/, "").toLowerCase();
  return host + path;
}

/** The address as people read it, under a place's name: "reddit.com/r/SideProject". */
export function displayUrl(url: string): string {
  const parsed = parse(url);
  if (!parsed) return url;
  return parsed.hostname.replace(/^www\./, "") + parsed.pathname.replace(/\/+$/, "");
}

/**
 * A website as the user typed it: "SimpleDash.com", "https://www.simpledash.com/" or
 * "github.com/me/tool". Gives the address to keep (https:// added when missing, no query,
 * hash or trailing slash) and its key. Null when it isn't a website.
 */
export function readWebsite(input: string): { url: string; key: string } | null {
  const text = input.trim();
  if (!text || text.length > 300) return null;
  const parsed = parse(/^[a-z][a-z\d+.-]*:\/\//i.test(text) ? text : `https://${text}`);
  if (!parsed || parsed.username || parsed.password) return null;
  const host = parsed.hostname.toLowerCase();
  if (!/^[a-z\d-]+(\.[a-z\d-]+)*\.[a-z][a-z\d-]+$/.test(host)) return null;
  const url = `${parsed.protocol}//${host}${parsed.port ? `:${parsed.port}` : ""}${parsed.pathname.replace(/\/+$/, "")}`;
  return { url, key: urlKey(url)! };
}
