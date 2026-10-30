import { describe, expect, it } from "vitest";
import { parseXHandle, xComposeUrl, xPostId, xPostUrl, xProfileUrl } from "./x";

describe("parseXHandle", () => {
  it("reads every way people write a profile", () => {
    for (const input of [
      "siaramzee",
      "@siaramzee",
      " siaramzee ",
      "x.com/siaramzee",
      "https://x.com/siaramzee",
      "https://www.x.com/siaramzee/",
      "https://twitter.com/siaramzee?s=21",
      "mobile.twitter.com/@siaramzee",
      "https://x.com/siaramzee/status/123",
    ]) {
      expect(parseXHandle(input), input).toBe("siaramzee");
    }
  });

  it("rejects what isn't a profile", () => {
    for (const input of [
      "",
      "sia ramzee",
      "a_handle_that_is_too_long",
      "https://x.com/home",
      "https://x.com/i/status/123",
      "https://example.com/siaramzee",
      "x.com/",
      "https://",
    ]) {
      expect(parseXHandle(input), input).toBeNull();
    }
  });
});

describe("X links", () => {
  it("reads the post id from a post link", () => {
    expect(xPostId("https://x.com/siaramzee/status/1983456789012345678")).toBe(
      "1983456789012345678",
    );
    expect(xPostId("https://twitter.com/siaramzee/status/42?s=20")).toBe("42");
    expect(xPostId("https://x.com/i/web/status/42")).toBe("42");
    expect(xPostId("https://x.com/siaramzee")).toBeNull();
    expect(xPostId("https://example.com/a/status/42")).toBeNull();
    expect(xPostId("not a url")).toBeNull();
  });

  it("builds profile, post and compose links", () => {
    expect(xProfileUrl("siaramzee")).toBe("https://x.com/siaramzee");
    expect(xPostUrl("siaramzee", "42")).toBe("https://x.com/siaramzee/status/42");
    expect(xPostUrl(null, "42")).toBe("https://x.com/i/status/42");
    expect(xComposeUrl("Still no paid user 🙃\nok")).toBe(
      "https://x.com/intent/post?text=Still%20no%20paid%20user%20%F0%9F%99%83%0Aok",
    );
  });
});
