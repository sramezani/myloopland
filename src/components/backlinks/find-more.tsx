import { CardShell } from "@/components/shared/card-shell";
import { Copyable } from "@/components/shared/copyable";

/** How the list grows: Claude searches, skips what's listed and adds the rest. */
export function FindMore({ website }: { website: string }) {
  // Things to say to Claude about the list (the backlinks routine, src/lib/mcp/routines.ts).
  const lines = [
    `Find new backlink places for ${website} with myloopland`,
    `I submitted ${website} to SaaSHub: tick it in myloopland`,
  ];
  return (
    <CardShell id="find-more" title="Find more with Claude">
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-pretty text-muted-foreground">
          Ask your Claude to look for new places. It opens your website to see what it is, searches
          the web, skips the places already here, and adds the rest with their cost and catch. New
          ones are marked <span className="font-medium text-suggested-foreground">New</span> for two
          weeks. It never submits anything for you.
        </p>
        <ul className="flex flex-col gap-2">
          {lines.map((text) => (
            <li key={text}>
              <Copyable text={text} />
            </li>
          ))}
        </ul>
        <p className="text-xs text-pretty text-muted-foreground">
          In Claude you can also pick the prompt &ldquo;Find new backlink places&rdquo; from the
          myloopland connector.
        </p>
      </div>
    </CardShell>
  );
}
