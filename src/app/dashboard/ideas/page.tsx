import type { Metadata } from "next";
import { setIdeaPublishedAction, setMyRatingAction } from "@/app/actions/ideas";
import { AccountMenu } from "@/app/dashboard/account-menu";
import { TopBar } from "@/components/account/top-bar";
import { AskForIdeas } from "@/components/ideas/ask-for-ideas";
import { IdeaTable } from "@/components/ideas/idea-table";
import { Container } from "@/components/shared/container";
import { requireUser } from "@/lib/auth/session";
import { listIdeas } from "@/lib/ideas/ideas";
import { getProfile } from "@/lib/profile/profile";

export const metadata: Metadata = {
  title: "Ideas",
  robots: { index: false, follow: false },
};

/**
 * Post ideas from Claude and Codex with their ratings (docs/SPEC.md section 13). Only the
 * user's own rating and the published tick can be changed here; ideas come from the MCP tools.
 */
export default async function IdeasPage() {
  const user = await requireUser();
  const [profile, ideas] = await Promise.all([getProfile(user.id), listIdeas(user.id)]);

  return (
    <>
      <TopBar
        menu={<AccountMenu name={user.name} email={user.email} handle={profile?.xHandle ?? null} />}
        current="ideas"
      />
      <main id="main" className="pb-16">
        <Container className="flex max-w-5xl flex-col gap-5 pt-6">
          <header className="flex flex-col gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Ideas</h1>
            <p className="text-sm text-pretty text-muted-foreground">
              Post ideas from your Claude, rated from 1 to 10. Add your own rating and tick the ones
              you&apos;ve published.{ideas.length > 1 ? " Click a rating heading to sort." : ""}
            </p>
          </header>
          {ideas.length > 0 ? (
            <IdeaTable
              ideas={ideas}
              setMyRating={setMyRatingAction}
              setPublished={setIdeaPublishedAction}
            />
          ) : null}
          <AskForIdeas empty={ideas.length === 0} />
        </Container>
      </main>
    </>
  );
}
