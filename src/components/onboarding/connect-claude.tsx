import { CardShell } from "@/components/shared/card-shell";
import { CopyButton } from "@/components/shared/copy-button";

const ROUTINES = [
  { when: "Every morning, around 07:30", prompt: "Run my myloopland morning routine" },
  {
    when: "Every evening, around 21:30 (on your computer, with a browser signed in to X)",
    prompt: "Run my myloopland evening routine",
  },
  { when: "Every Sunday", prompt: "Run my myloopland weekly routine" },
];

function Copyable({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 rounded-lg border bg-past px-3 py-2 font-mono text-sm break-all">
        {text}
      </code>
      <CopyButton text={text} />
    </div>
  );
}

/**
 * How to connect Claude: the MCP address, the three steps, the first thing to say, and the
 * daily routines for scheduled tasks. Shown until Claude is connected, then from the menu.
 */
export function ConnectClaude({ mcpUrl, connected }: { mcpUrl: string; connected: boolean }) {
  return (
    <CardShell id="connect" title={connected ? "Claude is connected" : "Connect your Claude"}>
      <div className="flex flex-col gap-5">
        <p className="text-sm text-pretty text-muted-foreground">
          Your Claude does the work: it plans, drafts and reads your numbers. myloopland keeps it
          all, so Claude gets better every week.
        </p>
        <ol className="flex flex-col gap-4 text-sm">
          <li className="flex flex-col gap-2">
            <p>
              <span className="font-semibold">1.</span> In Claude (web, desktop or phone), open
              Settings → Connectors → Add custom connector, and paste this address. Keep
              Claude&apos;s recommended sign-in settings.
            </p>
            <Copyable text={mcpUrl} />
          </li>
          <li>
            <span className="font-semibold">2.</span> Click Connect, sign in with Google, then
            Allow.
          </li>
          <li className="flex flex-col gap-2">
            <p>
              <span className="font-semibold">3.</span> In a new chat, say:
            </p>
            <Copyable text="Set up my X growth plan with myloopland" />
          </li>
        </ol>
        <details className="group text-sm">
          <summary className="font-medium">Using Claude Code</summary>
          <div className="mt-2 flex flex-col gap-2">
            <Copyable text={`claude mcp add --transport http myloopland ${mcpUrl}`} />
            <p className="text-muted-foreground">Then run /mcp to sign in.</p>
          </div>
        </details>
        <details className="text-sm">
          <summary className="font-medium">Daily routines for scheduled tasks</summary>
          <ul className="mt-2 flex flex-col gap-3">
            {ROUTINES.map((routine) => (
              <li key={routine.prompt} className="flex flex-col gap-1.5">
                <p className="text-muted-foreground">{routine.when}</p>
                <Copyable text={routine.prompt} />
              </li>
            ))}
          </ul>
        </details>
      </div>
    </CardShell>
  );
}
