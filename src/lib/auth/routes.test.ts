import { describe, expect, it } from "vitest";
import { isPublicAuthPath } from "./routes";

describe("isPublicAuthPath", () => {
  it("lets through sign-in, Google's callback and Claude's OAuth endpoints", () => {
    for (const path of [
      "/api/auth/sign-in/social",
      "/api/auth/callback/google",
      "/api/auth/callback/google/",
      "/api/auth/jwks",
      "/api/auth/oauth2/authorize",
      "/api/auth/oauth2/token",
      "/api/auth/oauth2/consent",
      "/api/auth/.well-known/oauth-authorization-server",
    ]) {
      expect(isPublicAuthPath(path), path).toBe(true);
    }
  });

  it("answers 404 for everything else", () => {
    for (const path of [
      "/api/auth/get-access-token",
      "/api/auth/refresh-token",
      "/api/auth/list-accounts",
      "/api/auth/oauth2",
      "/api/auth/callback/github",
    ]) {
      expect(isPublicAuthPath(path), path).toBe(false);
    }
  });
});
