"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { saveXProfile } from "@/lib/profile/profile";
import { readXProfileForm } from "@/lib/profile/validate";
import { reportError } from "@/lib/report-error";

export type XProfileState = { error?: string; saved?: boolean; value?: string } | null;

/** The app's one input: the X profile. Saving it also starts the default plan. */
export async function saveXProfileAction(
  _state: XProfileState,
  formData: FormData,
): Promise<XProfileState> {
  const user = await requireUser();
  const form = readXProfileForm(formData);
  if (!form.ok) return { error: form.error, value: String(formData.get("profile") ?? "") };
  try {
    await saveXProfile(user.id, form.handle, form.timeZone);
  } catch (error) {
    reportError("saving the X profile failed", error);
    return { error: "Couldn't save. Please try again." };
  }
  revalidatePath("/dashboard");
  return { saved: true };
}
