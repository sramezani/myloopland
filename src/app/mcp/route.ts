import { requireMcpAuth } from "@better-auth/mcp";
import { createMcpHandler } from "@modelcontextprotocol/server";
import { auth } from "@/lib/auth/auth";
import { mcpResourceUrl } from "@/lib/auth/mcp-resource";
import { env } from "@/lib/env";
import { buildServer } from "@/lib/mcp/server";

/**
 * The MCP endpoint Claude connects to (docs/mcp.md). Every request is a POST carrying an
 * access token bound to this URL; requireMcpAuth checks it against our JWKS and answers 401
 * with the discovery pointer when it's missing. Stateless: a fresh server per request.
 * The SDK's default `legacy: "stateless"` also serves clients on the 2025 protocol.
 */
const mcp = createMcpHandler(({ authInfo }) => buildServer(String(authInfo?.extra?.userId)));

export async function POST(request: Request) {
  const protect = requireMcpAuth(
    auth,
    (req, claims) => {
      // User tokens only: a client-credentials token has no user to work for.
      if (!claims.sub) return Response.json({ error: "insufficient_scope" }, { status: 403 });
      return mcp.fetch(req, {
        authInfo: {
          token: "",
          clientId: String(claims.azp ?? claims.client_id ?? ""),
          scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
          extra: { userId: claims.sub },
        },
      });
    },
    { resource: mcpResourceUrl(env.APP_URL) },
  );
  return protect(request);
}
