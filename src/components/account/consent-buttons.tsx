"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";

/**
 * Allow or Cancel on Claude's connect step. The signed OAuth query in this page's address
 * goes along (oauthProviderClient), and Better Auth answers with where to go next: back to
 * Claude with a code, or with "access denied".
 */
export function ConsentButtons() {
  const [busy, setBusy] = useState<"allow" | "cancel" | null>(null);
  const [failed, setFailed] = useState(false);

  async function answer(accept: boolean) {
    setBusy(accept ? "allow" : "cancel");
    setFailed(false);
    const { data, error } = await authClient.oauth2.consent({ accept });
    if (error || !data?.url) {
      setBusy(null);
      setFailed(true);
      return;
    }
    window.location.href = data.url;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button
          size="lg"
          className="h-11 sm:flex-1"
          disabled={busy !== null}
          onClick={() => answer(true)}
        >
          {busy === "allow" ? "Connecting…" : "Allow"}
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-11 sm:flex-1"
          disabled={busy !== null}
          onClick={() => answer(false)}
        >
          Cancel
        </Button>
      </div>
      {failed ? (
        <p role="alert" className="text-sm text-destructive">
          That didn&apos;t work. Start connecting again from Claude.
        </p>
      ) : null}
    </div>
  );
}
