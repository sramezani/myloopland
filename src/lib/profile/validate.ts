import { isTimeZone } from "@/lib/dates";
import { parseXHandle } from "@/lib/x/x";

export type XProfileForm =
  { ok: true; handle: string; timeZone: string | null } | { ok: false; error: string };

/** Reads the X profile form: the one input, plus the time zone the browser filled in. */
export function readXProfileForm(formData: FormData): XProfileForm {
  const profile = String(formData.get("profile") ?? "");
  const handle = parseXHandle(profile);
  if (!handle) {
    return {
      ok: false,
      error: profile.trim()
        ? "That doesn't look like an X profile. Try x.com/yourname or @yourname."
        : "Add your X profile, like x.com/yourname.",
    };
  }
  const timeZone = String(formData.get("time_zone") ?? "");
  return { ok: true, handle, timeZone: isTimeZone(timeZone) ? timeZone : null };
}
