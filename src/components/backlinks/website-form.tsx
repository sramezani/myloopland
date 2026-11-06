"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { OneFieldForm, type OneFieldState } from "@/components/shared/one-field-form";

type Action = (state: OneFieldState, formData: FormData) => Promise<OneFieldState>;

/** The page for one website's list: /dashboard/backlinks?site=simpledash.com */
export function websiteHref(key: string): Route {
  return `/dashboard/backlinks?site=${encodeURIComponent(key).replaceAll("%2F", "/")}` as Route;
}

type WebsiteFormProps = {
  action: Action;
  submitLabel?: string;
  autoFocus?: boolean;
  hideLabel?: boolean;
  /** Called once the website is added, before its list opens (eg to close a dialog). */
  onAdded?: () => void;
};

/** Adds a website to collect backlinks for, then opens its list. */
export function WebsiteForm({
  action,
  submitLabel = "Add",
  autoFocus,
  hideLabel,
  onAdded,
}: WebsiteFormProps) {
  const router = useRouter();
  const opened = useCallback(
    (state: NonNullable<OneFieldState>) => {
      onAdded?.();
      if (state.value) router.push(websiteHref(state.value));
    },
    [onAdded, router],
  );

  return (
    <OneFieldForm
      action={action}
      name="website"
      label="Website"
      hideLabel={hideLabel}
      placeholder="yourproduct.com"
      submitLabel={submitLabel}
      pendingLabel="Adding…"
      autoFocus={autoFocus}
      onSaved={opened}
    />
  );
}
