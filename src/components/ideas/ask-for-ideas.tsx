import { CardShell } from "@/components/shared/card-shell";
import { Copyable } from "@/components/shared/copyable";

/** Where ideas come from: lines to say to Claude, and to Codex, about the list. */
export function AskForIdeas({ empty }: { empty: boolean }) {
  // Things to say about the list (the chat routine, src/lib/mcp/routines.ts).
  const lines = [
    { where: "In Claude", text: "Give me 10 post ideas for this week with myloopland" },
    { where: "In Codex", text: "Rate the ideas in myloopland" },
  ];
  return (
    <CardShell id="ask-for-ideas" title={empty ? "No ideas yet" : "More ideas"}>
      <div className="flex flex-col gap-3 text-sm">
        <p className="text-pretty text-muted-foreground">
          Ask your Claude for post ideas. It reads the list first, so it doesn&apos;t repeat one,
          and adds each idea with its rating from 1 to 10. If you use Codex, connect it to
          myloopland the same way and ask it to rate them. Your own rating and the published tick
          are set here.
        </p>
        <ul className="flex flex-col gap-2">
          {lines.map(({ where, text }) => (
            <li key={text} className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{where}</span>
              <Copyable text={text} />
            </li>
          ))}
        </ul>
      </div>
    </CardShell>
  );
}
