import { describe, expect, it } from "vitest";
import { readXProfileForm } from "./validate";

const form = (entries: Record<string, string>) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
};

describe("readXProfileForm", () => {
  it("reads the handle and a real time zone", () => {
    expect(
      readXProfileForm(form({ profile: "https://x.com/siaramzee", time_zone: "Europe/Amsterdam" })),
    ).toEqual({
      ok: true,
      handle: "siaramzee",
      timeZone: "Europe/Amsterdam",
    });
  });

  it("drops a time zone it doesn't know", () => {
    expect(readXProfileForm(form({ profile: "@sia", time_zone: "Nowhere/Land" }))).toMatchObject({
      ok: true,
      timeZone: null,
    });
  });

  it("explains what's wrong in plain words", () => {
    expect(readXProfileForm(form({ profile: "" }))).toEqual({
      ok: false,
      error: "Add your X profile, like x.com/yourname.",
    });
    expect(readXProfileForm(form({ profile: "https://example.com/sia" }))).toMatchObject({
      ok: false,
    });
  });
});
