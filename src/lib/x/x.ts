/**
 * X addresses: reading the profile the user typed, post links Claude records, and the
 * "Open in X" compose link. The server never calls X; these only build and read URLs.
 */

const HANDLE = /^[A-Za-z0-9_]{1,15}$/;
const X_HOSTS = new Set([
  "x.com",
  "www.x.com",
  "mobile.x.com",
  "twitter.com",
  "www.twitter.com",
  "mobile.twitter.com",
]);
// First path parts that are X pages, not people.
const NOT_PROFILES = new Set([
  "home",
  "i",
  "explore",
  "search",
  "settings",
  "messages",
  "notifications",
  "compose",
  "intent",
  "login",
  "signup",
  "share",
  "hashtag",
]);
const STATUS_PATH = /^\/(?:[A-Za-z0-9_]{1,15}|i(?:\/web)?)\/status(?:es)?\/(\d{1,25})(?:\/|$)/;

/**
 * The handle in what the user typed: "https://x.com/siaramzee", "x.com/siaramzee",
 * "@siaramzee" or "siaramzee". Null when it isn't an X profile.
 */
export function parseXHandle(input: string): string | null {
  const value = input.trim();
  if (!value) return null;
  if (!value.includes("/")) {
    const handle = value.replace(/^@/, "");
    return HANDLE.test(handle) ? handle : null;
  }
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  if (!X_HOSTS.has(url.hostname.toLowerCase())) return null;
  const first = url.pathname.split("/").filter(Boolean)[0]?.replace(/^@/, "") ?? "";
  if (!HANDLE.test(first) || NOT_PROFILES.has(first.toLowerCase())) return null;
  return first;
}

export function xProfileUrl(handle: string): string {
  return `https://x.com/${handle}`;
}

/** The post id in an X post link, or null. */
export function xPostId(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (!X_HOSTS.has(parsed.hostname.toLowerCase())) return null;
    return STATUS_PATH.exec(parsed.pathname)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** A clean link to a post, without tracking parameters. */
export function xPostUrl(handle: string | null, postId: string): string {
  return `https://x.com/${handle ?? "i"}/status/${postId}`;
}

/** X's compose screen with the text filled in. On a phone it opens the X app. */
export function xComposeUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}
