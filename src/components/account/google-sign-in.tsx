"use client";

import { useState } from "react";
import { GoogleButton } from "@/components/shared/google-button";
import { authClient } from "@/lib/auth/client";

/**
 * "Continue with Google". When Claude's connect flow sent the user here, the signed query in
 * this page's address goes along, so after Google the flow continues to the consent step.
 */
export function GoogleSignIn({ className }: { className?: string }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <GoogleButton
        className={className}
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setFailed(false);
          const { error } = await authClient.signIn.social({
            provider: "google",
            callbackURL: "/dashboard",
            errorCallbackURL: "/signin",
          });
          if (error) {
            setBusy(false);
            setFailed(true);
          }
        }}
      >
        {busy ? "Opening Google…" : "Continue with Google"}
      </GoogleButton>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t open Google sign-in. Please try again.
        </p>
      ) : null}
    </div>
  );
}
