/**
 * Better Auth endpoints reachable over HTTP. Signing out runs as a server action, so the
 * browser needs only Google sign-in and its callback, plus the OAuth endpoints Claude uses to
 * connect: authorize, token, consent and the signing keys. Everything else (such as
 * /get-access-token, which would hand the Google token to the browser) answers 404.
 */
const PUBLIC_AUTH_PATHS = new Set([
  "/api/auth/sign-in/social",
  "/api/auth/callback/google",
  "/api/auth/error",
  "/api/auth/jwks",
]);
const PUBLIC_AUTH_PREFIXES = ["/api/auth/oauth2/", "/api/auth/.well-known/"];

export function isPublicAuthPath(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "");
  return PUBLIC_AUTH_PATHS.has(path) || PUBLIC_AUTH_PREFIXES.some((p) => path.startsWith(p));
}
