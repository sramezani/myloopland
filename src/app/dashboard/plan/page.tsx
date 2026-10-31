import { ArrowLeftIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountMenu } from "@/app/dashboard/account-menu";
import { TopBar } from "@/components/account/top-bar";
import { ChangeInClaude, PlanView } from "@/components/plan/plan-view";
import { Container } from "@/components/shared/container";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/format";
import { getActivePlaybook } from "@/lib/playbook/playbook";
import { getProfile } from "@/lib/profile/profile";

export const metadata: Metadata = {
  title: "Your plan",
  robots: { index: false, follow: false },
};

/**
 * The active playbook, read-only (docs/SPEC.md section 8): which version, why it last
 * changed, and how to change it in Claude. Before the X profile there is no plan yet.
 */
export default async function PlanPage() {
  const user = await requireUser();
  const profile = await getProfile(user.id);
  const handle = profile?.xHandle ?? null;
  const playbook = handle ? await getActivePlaybook(user.id) : null;
  if (!handle || !playbook) redirect("/dashboard");

  return (
    <>
      <TopBar menu={<AccountMenu name={user.name} email={user.email} handle={handle} />} />
      <main id="main" className="pb-16">
        <Container className="flex max-w-3xl flex-col gap-5 pt-6">
          <header className="flex flex-col gap-1.5">
            <Link
              href="/dashboard"
              className="-ml-1 inline-flex w-fit items-center gap-1 rounded-md px-1 py-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftIcon className="size-4" aria-hidden="true" />
              Calendar
            </Link>
            <h1 className="text-2xl font-bold tracking-tight">Your plan</h1>
            <p className="text-sm text-pretty text-muted-foreground">
              Version {playbook.version}, saved {formatDate(playbook.createdAt, profile?.timeZone)}.{" "}
              {playbook.summary}
            </p>
          </header>
          <PlanView plan={playbook.content} />
          <ChangeInClaude />
        </Container>
      </main>
    </>
  );
}
