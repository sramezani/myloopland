"use server";

import { revalidatePath } from "next/cache";
import type { OneFieldState } from "@/components/shared/one-field-form";
import { addWebsite, setBacklinkSubmitted } from "@/lib/backlinks/backlinks";
import { requireUser } from "@/lib/auth/session";
import { UserFacingError } from "@/lib/errors";
import { reportError } from "@/lib/report-error";

export type SubmittedResult =
  { ok: true; submittedAt: string | null } | { ok: false; error: string };

/** The tick on a backlink place (docs/SPEC.md section 12): submitted, or back to do. */
export async function setBacklinkSubmittedAction(
  id: string,
  submitted: boolean,
): Promise<SubmittedResult> {
  const user = await requireUser();
  if (typeof id !== "string" || !id || id.length > 100 || typeof submitted !== "boolean") {
    return { ok: false, error: "Couldn't save that. Reload the page and try again." };
  }
  try {
    const submittedAt = await setBacklinkSubmitted(user.id, id, submitted);
    revalidatePath("/dashboard/backlinks");
    return { ok: true, submittedAt };
  } catch (error) {
    // The data layer's message names the id, for Claude; people get plain words.
    if (error instanceof UserFacingError) {
      return { ok: false, error: "This place isn't on your list any more. Reload the page." };
    }
    reportError("saving a backlink tick failed", error);
    return { ok: false, error: "Couldn't save. Please try again." };
  }
}

/**
 * Adds a website to collect backlinks for, with its own starter list (docs/SPEC.md section 12).
 * Sends back its key, so the page can open it. A website that's already there just opens.
 */
export async function addWebsiteAction(
  _state: OneFieldState,
  formData: FormData,
): Promise<OneFieldState> {
  const user = await requireUser();
  const value = String(formData.get("website") ?? "").slice(0, 400);
  try {
    const site = await addWebsite(user.id, value);
    revalidatePath("/dashboard/backlinks");
    return { saved: true, value: site.key };
  } catch (error) {
    if (error instanceof UserFacingError) return { error: error.message, value };
    reportError("adding a website failed", error);
    return { error: "Couldn't save. Please try again.", value };
  }
}
