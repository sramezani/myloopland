import "server-only";
import { McpServer } from "@modelcontextprotocol/server";
import { brand } from "@/config/theme";
import { getProfile } from "@/lib/profile/profile";
import { routineFor, SERVER_INSTRUCTIONS, type RoutineMode } from "./routines";
import { registerTools } from "./tools";

const PROMPTS: { mode: Exclude<RoutineMode, "chat">; title: string; description: string }[] = [
  {
    mode: "setup",
    title: "Set up my X growth plan",
    description: "First time: make the playbook your own.",
  },
  {
    mode: "daily",
    title: "Daily: numbers, review and drafts",
    description:
      "The one scheduled run each morning: yesterday's numbers, the weekly review when it's due, and today's drafts.",
  },
  {
    mode: "morning",
    title: "Morning: today's drafts",
    description: "Write today's drafts from your notes and the news.",
  },
  {
    mode: "evening",
    title: "Evening: posts and numbers",
    description: "Record what you posted and read the numbers on X.",
  },
  {
    mode: "weekly",
    title: "Weekly review",
    description: "Learn from the numbers and improve the plan.",
  },
];

/**
 * One MCP server per request, for one user (the token's subject). The modern protocol and
 * the stateless 2025 fallback both build it from here (src/app/mcp/route.ts).
 */
export function buildServer(userId: string): McpServer {
  const server = new McpServer(
    { name: brand.name, version: "1.0.0" },
    { instructions: SERVER_INSTRUCTIONS },
  );
  registerTools(server, userId);
  for (const prompt of PROMPTS) {
    server.registerPrompt(
      prompt.mode,
      { title: prompt.title, description: prompt.description },
      async () => {
        const profile = await getProfile(userId);
        const steps = routineFor(prompt.mode, { handle: profile?.xHandle ?? null });
        return {
          messages: [
            {
              role: "user" as const,
              content: {
                type: "text" as const,
                text: `Run my myloopland ${prompt.mode} routine. Call get_briefing with mode "${prompt.mode}" first, then follow these steps:\n\n${steps}`,
              },
            },
          ],
        };
      },
    );
  }
  return server;
}
