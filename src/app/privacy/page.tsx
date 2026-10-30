import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { brand } from "@/config/theme";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What myloopland stores, why, and how to delete it.",
};

const sections = [
  {
    title: "What we store",
    items: [
      "From Google: your name, email address and profile picture, to sign you in.",
      "What you type here: your X profile address. We also keep your time zone, read from your browser, so your plan's times are yours.",
      "What your Claude saves through the connector: your plan and its old versions, drafts, the posts you made with their numbers, your notes, weekly reviews and decisions.",
      "Sign-in sessions and Claude's connection, with the browser and IP address that made them, to keep your account safe.",
    ],
  },
  {
    title: "What we don't do",
    items: [
      "We never ask for your X password and never use the X API. We never post, schedule or reply on X for you.",
      "No ads, no tracking scripts, and we never sell or share your data.",
      "Your data is only yours: other users can't see it, and Claude only sees it through the connection you allowed.",
    ],
  },
  {
    title: "Where it lives",
    items: [
      "On myloopland's own server. A copy of the database is backed up every night to Cloudflare R2, and old backups are deleted after 30 days.",
    ],
  },
  {
    title: "Deleting it",
    items: [
      "Delete account, in the menu on your dashboard, removes your account and everything above at once. Copies in backups disappear within 30 days.",
      "To disconnect Claude only, remove the myloopland connector in Claude's settings.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main id="main" className="py-12">
      <Container className="flex max-w-2xl flex-col gap-8">
        <Link href="/" aria-label="myloopland home" className="self-start rounded-md">
          <Logo />
        </Link>
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">Privacy</h1>
          <p className="text-muted-foreground">
            {brand.name} keeps only what it needs to help your Claude grow your X account.
          </p>
        </div>
        {sections.map((section) => (
          <section key={section.title} className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">{section.title}</h2>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-pretty">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
        <p className="text-sm text-muted-foreground">
          Questions? Ask{" "}
          <a href={brand.makerUrl} className="underline underline-offset-2 hover:text-foreground">
            {brand.makerName} on X
          </a>
          .
        </p>
      </Container>
    </main>
  );
}
