import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { createAuthClient } from "better-auth/react";

/**
 * The browser side of Better Auth, used by the sign-in and consent buttons only.
 * `oauthProviderClient()` carries the signed OAuth query of the page along, so when Claude
 * sent the user here, its connect flow continues after Google sign-in (docs/mcp.md).
 */
export const authClient = createAuthClient({ plugins: [oauthProviderClient()] });
