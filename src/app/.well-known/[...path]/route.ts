import { auth } from "@/lib/auth/auth";

/**
 * OAuth discovery at the site root, where MCP clients look (RFC 8414 / RFC 9728):
 * /.well-known/oauth-protected-resource/mcp and /.well-known/oauth-authorization-server/api/auth.
 * Better Auth serves both from its handler; anything else it answers with 404.
 */
export function GET(request: Request) {
  return auth.handler(request);
}
