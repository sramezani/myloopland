import type { Metadata } from "next";
import { deleteAccountAction } from "@/app/actions/account";
import { signOut } from "@/app/actions/auth";
import { saveXProfileAction } from "@/app/actions/profile";
import { TopBar } from "@/components/account/top-bar";
import { UserMenu } from "@/components/account/user-menu";
import { CalendarToolbar } from "@/components/calendar/calendar-toolbar";
import { DayView } from "@/components/calendar/day-view";
import { MonthGrid } from "@/components/calendar/month-grid";
import { ProgressLine } from "@/components/calendar/progress-line";
import { WeekColumns } from "@/components/calendar/week-columns";
import { ConnectClaude } from "@/components/onboarding/connect-claude";
import { XProfileForm } from "@/components/onboarding/x-profile-form";
import { CardShell } from "@/components/shared/card-shell";
import { Container } from "@/components/shared/container";
import { isClaudeConnected } from "@/lib/account/account";
import { mcpResourceUrl } from "@/lib/auth/mcp-resource";
import { requireUser } from "@/lib/auth/session";
import { getCalendar } from "@/lib/calendar/queries";
import { parseAnchor, parseView, rangeFor } from "@/lib/calendar/range";
import { todayIn } from "@/lib/dates";
import { env } from "@/lib/env";
import { getProfile } from "@/lib/profile/profile";
import { getProgress } from "@/lib/progress/progress";

export const metadata: Metadata = {
  title: "Your X calendar",
  robots: { index: false, follow: false },
};

/**
 * The dashboard (docs/SPEC.md section 8): read-only. The X profile form until there is one,
 * then the progress line, how to connect Claude (until it is connected), and the calendar.
 */
export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await requireUser();
  // From the database, not the session: its cookie cache can be minutes old.
  const profile = await getProfile(user.id);
  const handle = profile?.xHandle ?? null;
  const menu = (
    <UserMenu
      name={user.name}
      email={user.email}
      handle={handle}
      saveProfile={saveXProfileAction}
      signOut={signOut}
      deleteAccount={deleteAccountAction}
    />
  );

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
  const [{ days }, progress, connected] = await Promise.all([
    getCalendar(user.id, timeZone, range.from, range.to, now),
    getProgress(user.id, timeZone, now),
    isClaudeConnected(user.id),
  ]);

  return (
    <>
      <TopBar menu={menu} />
      <main id="main" className="pb-16">
        <Container className="flex flex-col gap-5 pt-6">
          <header className="flex flex-col gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight">Your X calendar</h1>
            <ProgressLine handle={handle} progress={progress} now={now} />
          </header>
          {!connected || params.connect === "1" ? (
            <ConnectClaude mcpUrl={mcpResourceUrl(env.APP_URL)} connected={connected} />
          ) : null}
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
