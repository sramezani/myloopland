import { CopyButton } from "@/components/shared/copy-button";

/** A line to copy (an address, a command, or something to say to Claude) and its Copy button. */
export function Copyable({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="min-w-0 flex-1 rounded-lg border bg-past px-3 py-2 font-mono text-sm wrap-anywhere">
        {text}
      </code>
      <CopyButton text={text} />
    </div>
  );
}
