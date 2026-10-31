import { CardShell } from "@/components/shared/card-shell";
import { formatDay, formatDayName, formatNumber, formatSigned } from "@/lib/format";
import { consecutiveRuns, type FollowerDay } from "@/lib/progress/history";
import { FollowersChart } from "./followers-chart";

/**
 * Followers over the last 90 days: the chart, and the same numbers as a table for anyone who
 * can't use the chart. The dashboard shows it once Claude has read the count on two days.
 */
export function FollowersCard({ days }: { days: FollowerDay[] }) {
  const first = days[0]!;
  const last = days.at(-1)!;
  const hasGaps = consecutiveRuns(days).length > 1;
  return (
    <CardShell
      id="followers"
      title="Followers"
      actions={
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatSigned(last.followers - first.followers)} since {formatDay(first.date)}
        </span>
      }
    >
      <div className="flex flex-col gap-3">
        <FollowersChart days={days} />
        {hasGaps ? (
          <p className="text-xs text-pretty text-muted-foreground">
            Gaps are days Claude didn&apos;t read your follower count.
          </p>
        ) : null}
        <details className="text-sm">
          <summary className="font-medium">Show the numbers</summary>
          <table className="mt-2 w-full tabular-nums">
            <thead>
              <tr className="text-left text-xs text-muted-foreground">
                <th scope="col" className="py-1 font-medium">
                  Day
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Followers
                </th>
              </tr>
            </thead>
            <tbody>
              {[...days].reverse().map((day) => (
                <tr key={day.date} className="border-t">
                  <td className="py-1.5">{formatDayName(day.date)}</td>
                  <td className="py-1.5 text-right">{formatNumber(day.followers)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </details>
      </div>
    </CardShell>
  );
}
