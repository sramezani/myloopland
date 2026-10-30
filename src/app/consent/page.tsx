import { CheckIcon, XIcon } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { ConsentButtons } from "@/components/account/consent-buttons";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { auth } from "@/lib/auth/auth";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = {
  title: "Connect Claude",
  robots: { index: false, follow: false },
};

/** The app asking to connect, by name, or by the host of its client id (Claude: claude.ai). */
async function appName(clientId: string | undefined): Promise<string> {
  if (!clientId) return "An app";
  try {
    const client = await auth.api.getOAuthClientPublic({
      query: { client_id: clientId },
      headers: await headers(),
    });
    if (client?.client_name) return client.client_name;
  } catch {
    // Unknown client: fall back to what its id says.
  }
  try {
    return new URL(clientId).hostname;
  } catch {
    return "An app";
  }
}

/**
 * Claude's connect step (docs/mcp.md): after sign-in, the user allows the app to use their
 * myloopland data through the MCP connector. Reached only from Better Auth's authorize step.
 */
export default async function ConsentPage({ searchParams }: PageProps<"/consent">) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    for (const v of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, v);
    }
  }
  const session = await getSession();
  if (!session) redirect(`/signin?${query.toString()}`);

  const name = await appName(query.get("client_id") ?? undefined);
  const scopes = new Set((query.get("scope") ?? "").split(" "));
  const can = [
    "Read your plan, drafts, posts and their numbers",
    "Save plans, drafts, posts, numbers, notes and reviews for you",
    ...(scopes.has("offline_access") ? ["Stay connected, so scheduled tasks keep working"] : []),
  ];

  return (
    <main id="main" className="flex min-h-dvh items-center py-12">
      <Container className="flex max-w-md flex-col gap-8">
        <Logo />
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-balance">
            Connect {name} to myloopland
          </h1>
          <p className="text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{session.user.email}</span>.
          </p>
        </div>
        <ul className="flex flex-col gap-3">
          {can.map((text) => (
            <li key={text} className="flex gap-3 text-sm">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-positive" aria-hidden="true" />
              {text}
            </li>
          ))}
          <li className="flex gap-3 text-sm">
            <XIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            It can&apos;t post on X: you always post yourself
          </li>
        </ul>
        <ConsentButtons />
        <p className="text-xs text-pretty text-muted-foreground">
          You can disconnect any time by removing the myloopland connector in Claude.
        </p>
      </Container>
    </main>
  );
}
