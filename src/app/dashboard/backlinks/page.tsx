import type { Metadata } from "next";
import { addWebsiteAction, setBacklinkSubmittedAction } from "@/app/actions/backlinks";
import { AccountMenu } from "@/app/dashboard/account-menu";
import { TopBar } from "@/components/account/top-bar";
import { BacklinkList } from "@/components/backlinks/backlink-list";
import { BacklinksHeader } from "@/components/backlinks/backlinks-header";
import { FindMore } from "@/components/backlinks/find-more";
import { WebsiteForm } from "@/components/backlinks/website-form";
import { WebsitePicker } from "@/components/backlinks/website-picker";
import { CardShell } from "@/components/shared/card-shell";
import { Container } from "@/components/shared/container";
import { requireUser } from "@/lib/auth/session";
import { listBacklinks, listWebsites } from "@/lib/backlinks/backlinks";
import { STARTER_PLACES } from "@/lib/backlinks/starter";
import { displayUrl, readWebsite } from "@/lib/backlinks/url";
import { getProfile } from "@/lib/profile/profile";

export const metadata: Metadata = {
  title: "Backlinks",
  robots: { index: false, follow: false },
};

type BacklinksPageProps = { searchParams: Promise<{ site?: string | string[] }> };

/**
 * Places to submit the user's websites to (docs/SPEC.md section 12), one list per website,
 * with a tick for each place. `?site=simpledash.com` picks the website; the first one opens
 * without it. Until there's a website, the page only asks for one.
 */
export default async function BacklinksPage({ searchParams }: BacklinksPageProps) {
  const user = await requireUser();
  const [profile, websites, { site }] = await Promise.all([
    getProfile(user.id),
    listWebsites(user.id),
    searchParams,
  ]);
  const wanted = typeof site === "string" ? readWebsite(site)?.key : undefined;
  const selected = websites.find((each) => each.key === wanted) ?? websites[0];
  const items = selected ? await listBacklinks(user.id, selected.id) : [];
  const label = selected ? displayUrl(selected.url) : undefined;

  return (
    <>
      <TopBar
        menu={<AccountMenu name={user.name} email={user.email} handle={profile?.xHandle ?? null} />}
        current="backlinks"
      />
      <main id="main" className="pb-16">
        <Container className="flex max-w-4xl flex-col gap-5 pt-6">
          {selected ? (
            <>
              <BacklinksHeader
                website={label}
                picker={
                  <WebsitePicker
                    websites={websites}
                    selectedId={selected.id}
                    addWebsite={addWebsiteAction}
                  />
                }
              />
              <BacklinkList
                // A fresh list per website: filters, search and pending ticks don't carry over.
                key={selected.id}
                items={items}
                timeZone={profile?.timeZone ?? "UTC"}
                now={new Date().toISOString()}
                setSubmitted={setBacklinkSubmittedAction}
              />
              <FindMore website={label!} />
            </>
          ) : (
            <>
              <BacklinksHeader />
              <CardShell id="add-website" title="Add your website">
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-pretty text-muted-foreground">
                    It starts with {STARTER_PLACES.length} places to submit to. Your Claude finds
                    more for it, and you tick each one once you&apos;ve sent it in. You can add more
                    websites later.
                  </p>
                  <WebsiteForm action={addWebsiteAction} submitLabel="Add website" hideLabel />
                </div>
              </CardShell>
            </>
          )}
        </Container>
      </main>
    </>
  );
}
