import type { Metadata } from "next";
import Link from "next/link";
import { saveXProfileAction } from "@/app/actions/profile";
import { AccountMenu } from "@/app/dashboard/account-menu";
import { TopBar } from "@/components/account/top-bar";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { DayView } from "@/components/calendar/day-view";
import { FollowersCard } from "@/components/calendar/followers-card";
import { MonthGrid } from "@/components/calendar/month-grid";
import { ProgressLine } from "@/components/calendar/progress-line";
import { WeekColumns } from "@/components/calendar/week-columns";
import { ConnectClaude } from "@/components/onboarding/connect-claude";
import { XProfileForm } from "@/components/onboarding/x-profile-form";
import { CardShell } from "@/components/shared/card-shell";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { isClaudeConnected } from "@/lib/account/account";
import { mcpResourceUrl } from "@/lib/auth/mcp-resource";
import { requireUser } from "@/lib/auth/session";
import { getCalendar } from "@/lib/calendar/queries";
import { parseAnchor, parseView, rangeFor } from "@/lib/calendar/range";
import { todayIn } from "@/lib/dates";
import { env } from "@/lib/env";
import { getProfile } from "@/lib/profile/profile";
import { getFollowerHistory, getProgress } from "@/lib/progress/progress";

export const metadata: Metadata = {
  title: "Your X calendar",
  robots: { index: false, follow: false },
};

/**
 * The dashboard (docs/SPEC.md section 8): read-only. The X profile form until there is one,
 * then the progress line with a link to the plan, how to connect Claude (until it is
 * connected), followers over 90 days (from two days of readings), and the calendar.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  // From the database, not the session: its cookie cache can be minutes old.
  const profile = await getProfile(user.id);
  const handle = profile?.xHandle ?? null;
  const menu = <AccountMenu name={user.name} email={user.email} handle={handle} />;

  if (!handle) {
    return (
      <>
        <TopBar menu={menu} />
        <main id="main" className="py-10">
          <Container className="flex max-w-xl flex-col gap-6">
            <h1 className="text-2xl font-bold tracking-tight">
              Welcome, {user.name.split(" ")[0]}
            </h1>
            <CardShell id="x-profile" title="Add your X profile">
              <div className="flex flex-col gap-4">
                <p className="text-sm text-pretty text-muted-foreground">
                  That&apos;s the only thing you type here. Next you connect your Claude, and it
                  does the rest: the plan, the drafts and the numbers.
                </p>
                <XProfileForm action={saveXProfileAction} submitLabel="Continue" />
              </div>
            </CardShell>
          </Container>
        </main>
      </>
    );
  }

  const timeZone = profile?.timeZone ?? "UTC";
  const params = await searchParams;
  const now = new Date();
  const today = todayIn(timeZone, now);
  const range = rangeFor(parseView(params.view), parseAnchor(params.date, today));
  const [{ days }, progress, connected, followers] = await Promise.all([
    getCalendar(user.id, timeZone, range.from, range.to, now),
    getProgress(user.id, timeZone, now),
    isClaudeConnected(user.id),
    getFollowerHistory(user.id, timeZone, 90, now),
  ]);

  return (
    <>
      <TopBar menu={menu} />
      <main id="main" className="pb-16">
        <Container className="flex flex-col gap-5 pt-6">
          <header className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight">Your X calendar</h1>
              <Button asChild variant="outline" size="lg" className="pointer-coarse:h-11">
                <Link href="/dashboard/plan">Your plan</Link>
              </Button>
            </div>
            <ProgressLine handle={handle} progress={progress} now={now} />
          </header>
          {!connected || params.connect === "1" ? (
            <ConnectClaude mcpUrl={mcpResourceUrl(env.APP_URL)} connected={connected} />
          ) : null}
          {followers.length >= 2 ? <FollowersCard days={followers} /> : null}
          <CalendarToolbar range={range} today={today} />
          {range.view === "month" ? (
            <MonthGrid days={days} />
          ) : range.view === "week" ? (
            <WeekColumns days={days} now={now} />
          ) : (
            <DayView day={days[0]!} now={now} />
          )}
          <p className="text-xs text-muted-foreground">Times are in your time zone, {timeZone}.</p>
        </Container>
      </main>
    </>
  );
}
