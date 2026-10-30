import "server-only";

type Context = Record<string, string | number | boolean | null | undefined>;

/**
 * Reports a server error to the log (`myloopland logs app` on the server).
 * Never pass tokens, secrets, email addresses or post texts in the context.
 */
export function reportError(message: string, error: unknown, context: Context = {}) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  console.error(`[myloopland] ${message}: ${detail.slice(0, 500)}`, context);
}
