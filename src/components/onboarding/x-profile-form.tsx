"use client";

import { useEffect, useRef } from "react";
import { OneFieldForm, type OneFieldState } from "@/components/shared/one-field-form";

type XProfileFormProps = {
  action: (state: OneFieldState, formData: FormData) => Promise<OneFieldState>;
  defaultValue?: string;
  submitLabel?: string;
  /** Called after a successful save, eg to close a dialog. */
  onSaved?: () => void;
};

/**
 * The user's X profile. The browser's time zone goes along in a hidden field, so the plan's
 * times are the user's own without asking.
 */
export function XProfileForm({ action, defaultValue, submitLabel, onSaved }: XProfileFormProps) {
  const timeZone = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timeZone.current) timeZone.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  return (
    <OneFieldForm
      action={action}
      name="profile"
      label="Your X profile"
      placeholder="x.com/yourname"
      defaultValue={defaultValue}
      submitLabel={submitLabel}
      onSaved={onSaved}
    >
      <input ref={timeZone} type="hidden" name="time_zone" />
    </OneFieldForm>
  );
}
