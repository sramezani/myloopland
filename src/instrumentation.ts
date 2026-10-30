/** Runs once when the server starts: checks the environment, so a bad deploy fails fast. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { checkEnvAtStartup } = await import("@/lib/env");
  checkEnvAtStartup();
}
