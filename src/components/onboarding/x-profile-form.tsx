"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type State = { error?: string; saved?: boolean; value?: string } | null;

type XProfileFormProps = {
  action: (state: State, formData: FormData) => Promise<State>;
  defaultValue?: string;
  submitLabel?: string;
  /** Called after a successful save, eg to close a dialog. */
  onSaved?: () => void;
};

/**
 * The app's one input: the user's X profile. The browser's time zone goes along in a hidden
 * field, so the plan's times are the user's own without asking.
 */
export function XProfileForm({
  action,
  defaultValue,
  submitLabel = "Save",
  onSaved,
}: XProfileFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const timeZone = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (timeZone.current) timeZone.current.value = Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);
  useEffect(() => {
    if (state?.saved) onSaved?.();
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor="x-profile">Your X profile</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id="x-profile"
          name="profile"
          // React resets the form after the action; keep what was typed when it failed.
          defaultValue={state?.value ?? defaultValue}
          placeholder="x.com/yourname"
          autoComplete="url"
          autoCapitalize="none"
          spellCheck={false}
          required
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? "x-profile-error" : undefined}
          className="h-11 sm:flex-1"
        />
        <input ref={timeZone} type="hidden" name="time_zone" />
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
      {state?.error ? (
        <p id="x-profile-error" role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
