/**
 * The MCP address users paste into Claude. Access tokens are bound to exactly this URL
 * (RFC 8707 / RFC 9728), so the auth config and the /mcp route must use the same value.
 */
export function mcpResourceUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, "")}/mcp`;
}
