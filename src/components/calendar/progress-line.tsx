import { formatAgo, formatMonthYear, formatNumber, formatSigned } from "@/lib/format";
import type { Progress } from "@/lib/progress/progress";
import { xProfileUrl } from "@/lib/x/x";

/**
 * Where the account stands, in one line (the mockup's header): followers and their change,
 * the goal, last week's posting, and how fresh the numbers are. Unknown parts are left out.
 */
export function ProgressLine({
  handle,
  progress,
  now,
}: {
  handle: string;
  progress: Progress;
  now: Date;
}) {
  const parts: string[] = [];
  if (progress.followers !== null) {
    const change =
      progress.change7d === null ? "" : ` (${formatSigned(progress.change7d)} this week)`;
    parts.push(`${formatNumber(progress.followers)} followers${change}`);
  }
  if (progress.goal) {
    parts.push(
      `goal ${formatNumber(progress.goal.followers)} by ${formatMonthYear(progress.goal.by)}`,
    );
  }
  const { posts, medianViews } = progress.last7;
  parts.push(
    `last 7 days: ${posts} ${posts === 1 ? "post" : "posts"}${medianViews === null ? "" : `, ${formatNumber(medianViews)} median views`}`,
  );
  parts.push(
    progress.numbersReadAt
      ? `numbers read ${formatAgo(progress.numbersReadAt, now)}`
      : "no numbers yet",
  );
  return (
    <p className="text-sm text-pretty text-muted-foreground tabular-nums">
      <a
        href={xProfileUrl(handle)}
        className="font-medium text-foreground underline-offset-2 hover:underline"
      >
        @{handle}
      </a>
      {parts.map((part) => (
        <span key={part}> · {part}</span>
      ))}
    </p>
  );
}
