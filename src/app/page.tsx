import Link from "next/link";
import { GoogleSignIn } from "@/components/account/google-sign-in";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { brand } from "@/config/theme";

const steps = [
  {
    title: "Sign in and add your X profile",
    text: "That's the only thing you type here. No X password, no X API.",
  },
  {
    title: "Connect myloopland to your Claude",
    text: "Claude plans your week, drafts the day's posts each morning and reads your numbers each evening.",
  },
  {
    title: "Post by hand, and get better every week",
    text: "Copy a draft from your phone and post it. Each week Claude looks at what worked and improves the plan with you.",
  },
];

/** The landing page: what it is, how it works, and one button. */
export default function HomePage() {
  return (
    <main id="main" className="flex min-h-dvh items-center py-12">
      <Container className="flex max-w-xl flex-col gap-10">
        <Logo />
        <div className="flex flex-col gap-4">
          <h1 className="text-4xl font-bold tracking-tight text-balance">{brand.tagline}</h1>
          <p className="text-lg text-pretty text-muted-foreground">{brand.description}</p>
        </div>
        <ol className="flex flex-col gap-5">
          {steps.map((step, i) => (
            <li key={step.title} className="flex gap-4">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold tabular-nums"
              >
                {i + 1}
              </span>
              <div className="flex flex-col gap-1">
                <h2 className="font-semibold">{step.title}</h2>
                <p className="text-sm text-pretty text-muted-foreground">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="flex flex-col gap-3">
          <GoogleSignIn className="w-full sm:w-auto sm:self-start" />
          <p className="text-xs text-muted-foreground">
            Free. You post yourself: myloopland never posts for you.{" "}
            <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy
            </Link>
            {" · "}
            <a href={brand.makerUrl} className="underline underline-offset-2 hover:text-foreground">
              Made by {brand.makerName}
            </a>
          </p>
        </div>
      </Container>
    </main>
  );
}
