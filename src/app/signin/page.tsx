import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GoogleSignIn } from "@/components/account/google-sign-in";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { Notice } from "@/components/shared/notice";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in with Google to see your X plan, drafts and numbers.",
  robots: { index: false, follow: true },
};

/**
 * Google sign-in. Also the login page of Claude's connect flow (docs/mcp.md): the OAuth query
 * stays in the address, and the button carries it along.
 */
export default function SignInPage({ searchParams }: PageProps<"/signin">) {
  return (
    <main id="main" className="flex min-h-dvh items-center py-12">
      <Container className="flex max-w-md flex-col gap-8">
        <Link href="/" aria-label="myloopland home" className="self-start rounded-md">
          <Logo />
        </Link>
        <div className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold tracking-tight">Sign in</h1>
          <Suspense fallback={<Intro claude={false} />}>
            <IntroFor searchParams={searchParams} />
          </Suspense>
        </div>
        <Suspense fallback={null}>
          <SignInError searchParams={searchParams} />
        </Suspense>
        <GoogleSignIn className="w-full" />
        <p className="text-xs text-pretty text-muted-foreground">
          We only see your name, email and profile picture. Read the{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-foreground">
            privacy page
          </Link>
          .
        </p>
      </Container>
    </main>
  );
}

function Intro({ claude }: { claude: boolean }) {
  return (
    <p className="text-pretty text-muted-foreground">
      {claude
        ? "Claude wants to connect to your myloopland. Continue with Google, then allow it, and you're back in Claude."
        : "Continue with Google to see your plan, drafts and numbers."}
    </p>
  );
}

async function IntroFor({ searchParams }: Pick<PageProps<"/signin">, "searchParams">) {
  const { client_id } = await searchParams;
  return <Intro claude={Boolean(client_id)} />;
}

async function SignInError({ searchParams }: Pick<PageProps<"/signin">, "searchParams">) {
  const { error, expired } = await searchParams;
  if (expired === "1" && !error) {
    return (
      <Notice title="You're signed out">
        Your sign-in has ended. Continue with Google to see your dashboard again.
      </Notice>
    );
  }
  if (!error) return null;
  const cancelled = error === "access_denied";
  return (
    <Notice tone="warning" title={cancelled ? "Sign-in was cancelled" : "Sign-in didn't finish"}>
      {cancelled
        ? "You closed Google's screen before allowing access. Try again when you're ready."
        : "Something went wrong on the way back from Google. Please try again."}
    </Notice>
  );
}
