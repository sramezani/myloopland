import { beforeEach, describe, expect, it, vi } from "vitest";
import { UserFacingError } from "@/lib/errors";

/**
 * The Ideas page's two server actions: the user comes from the session, the input is checked,
 * and data-layer errors become plain words. The data layer has its own database test.
 */
const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  setMyRating: vi.fn(),
  setIdeaPublished: vi.fn(),
  reportError: vi.fn(),
}));

vi.mock("@/lib/auth/session", () => ({ requireUser: mocks.requireUser }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/lib/report-error", () => ({ reportError: mocks.reportError }));
vi.mock("@/lib/ideas/ideas", () => ({
  setMyRating: mocks.setMyRating,
  setIdeaPublished: mocks.setIdeaPublished,
}));

const { setIdeaPublishedAction, setMyRatingAction } = await import("./ideas");

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireUser.mockResolvedValue({ id: "user-1" });
  mocks.setMyRating.mockResolvedValue({});
  mocks.setIdeaPublished.mockResolvedValue({});
});

describe("setMyRatingAction", () => {
  it("saves the signed-in user's rating and refreshes the page", async () => {
    expect(await setMyRatingAction("idea-1", 7)).toEqual({ ok: true });
    expect(mocks.setMyRating).toHaveBeenCalledWith("user-1", "idea-1", 7);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/ideas");
  });

  it("clears the rating with null", async () => {
    expect(await setMyRatingAction("idea-1", null)).toEqual({ ok: true });
    expect(mocks.setMyRating).toHaveBeenCalledWith("user-1", "idea-1", null);
  });

  it("refuses ratings outside 1 to 10 and bad ids without saving", async () => {
    for (const [id, rating] of [
      ["idea-1", 0],
      ["idea-1", 11],
      ["idea-1", 4.5],
      ["idea-1", "7"],
      ["", 5],
      ["x".repeat(101), 5],
      [42, 5],
    ] as const) {
      const result = await setMyRatingAction(id as string, rating as number);
      expect(result).toMatchObject({ ok: false });
    }
    expect(mocks.setMyRating).not.toHaveBeenCalled();
  });

  it("says in plain words when the idea isn't the user's any more", async () => {
    mocks.setMyRating.mockRejectedValue(new UserFacingError("There is no idea with id idea-9."));
    expect(await setMyRatingAction("idea-9", 3)).toEqual({
      ok: false,
      error: "This idea isn't on your list any more. Reload the page.",
    });
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it("reports an unexpected failure and asks to try again", async () => {
    mocks.setMyRating.mockRejectedValue(new Error("connection lost"));
    expect(await setMyRatingAction("idea-1", 3)).toEqual({
      ok: false,
      error: "Couldn't save. Please try again.",
    });
    expect(mocks.reportError).toHaveBeenCalledOnce();
  });

  it("checks the session before anything else", async () => {
    mocks.requireUser.mockRejectedValue(new Error("NEXT_REDIRECT"));
    await expect(setMyRatingAction("idea-1", 3)).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.setMyRating).not.toHaveBeenCalled();
  });
});

describe("setIdeaPublishedAction", () => {
  it("ticks and unticks an idea for the signed-in user", async () => {
    expect(await setIdeaPublishedAction("idea-1", true)).toEqual({ ok: true });
    expect(await setIdeaPublishedAction("idea-1", false)).toEqual({ ok: true });
    expect(mocks.setIdeaPublished.mock.calls).toEqual([
      ["user-1", "idea-1", true],
      ["user-1", "idea-1", false],
    ]);
  });

  it("refuses anything but true or false", async () => {
    const result = await setIdeaPublishedAction("idea-1", "yes" as unknown as boolean);
    expect(result).toMatchObject({ ok: false });
    expect(mocks.setIdeaPublished).not.toHaveBeenCalled();
  });
});
