import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "./auth";

/**
 * The signed-in session, read once per request. `headers()` comes first: it marks the
 * page as dynamic before Better Auth (and its secret) is touched, so a build without
 * env vars (the Docker image) skips these pages instead of failing.
 */
export const getSession = cache(async () => {
  const requestHeaders = await headers();
  return auth.api.getSession({ headers: requestHeaders });
});

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSession>>>["user"];

/**
 * Runs at the top of every signed-in page and server action. Sends signed-out visitors to
 * /signin. `?expired=1` stops src/proxy.ts sending a browser with a stale cookie back here.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/signin?expired=1");
  return session.user;
}

/**
 * Signs the current browser out, also when the session row is already gone (account
 * deleted). Clearing the cookies matters: the session cookie cache lasts 5 minutes.
 */
export async function endCurrentSession() {
  const jar = await cookies();
  try {
    // Better Auth deletes the session and expires its cookies (with the right attributes).
    await auth.api.signOut({ headers: await headers() });
    return;
  } catch {
    // No session row any more: expire the cookies by hand.
  }
  for (const { name } of jar.getAll()) {
    if (!/^(__Secure-)?better-auth\./.test(name)) continue;
    // Browsers ignore a __Secure- cookie unless the Set-Cookie also says Secure.
    jar.delete({ name, path: "/", secure: name.startsWith("__Secure-") });
  }
}
