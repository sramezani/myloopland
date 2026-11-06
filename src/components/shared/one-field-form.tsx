"use client";

import { useActionState, useEffect, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** What a one-field action sends back: an error to show, or saved (with what it saved). */
export type OneFieldState = { error?: string; saved?: boolean; value?: string } | null;

type OneFieldFormProps = {
  action: (state: OneFieldState, formData: FormData) => Promise<OneFieldState>;
  /** The input's id and name. */
  name: string;
  label: string;
  /** For screen readers only, when a dialog title already names the field. */
  hideLabel?: boolean;
  placeholder?: string;
  defaultValue?: string;
  submitLabel?: string;
  pendingLabel?: string;
  autoFocus?: boolean;
  /** Called after a successful save, eg to close a dialog or open what was added. */
  onSaved?: (state: NonNullable<OneFieldState>) => void;
  /** Hidden inputs that go along with the field. */
  children?: ReactNode;
};

/**
 * A form with one web address and a button, as used for the X profile and for websites.
 * A failed save keeps what was typed and says why under the field.
 */
export function OneFieldForm({
  action,
  name,
  label,
  hideLabel,
  placeholder,
  defaultValue,
  submitLabel = "Save",
  pendingLabel = "Saving…",
  autoFocus,
  onSaved,
  children,
}: OneFieldFormProps) {
  const [state, formAction, pending] = useActionState(action, null);
  const errorId = `${name}-error`;

  useEffect(() => {
    if (state?.saved) onSaved?.(state);
  }, [state, onSaved]);

  return (
    <form action={formAction} className="flex flex-col gap-2">
      <Label htmlFor={name} className={hideLabel ? "sr-only" : undefined}>
        {label}
      </Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={name}
          name={name}
          // React resets the form after the action; keep what was typed when it failed.
          defaultValue={state?.error ? state.value : defaultValue}
          placeholder={placeholder}
          inputMode="url"
          autoComplete="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          autoFocus={autoFocus}
          required
          aria-invalid={state?.error ? true : undefined}
          aria-describedby={state?.error ? errorId : undefined}
          className="h-11 sm:flex-1"
        />
        {children}
        <Button type="submit" size="lg" className="h-11" disabled={pending}>
          {pending ? pendingLabel : submitLabel}
        </Button>
      </div>
      {state?.error ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
