import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";

/** The signed-in pages' top bar: the logo and the account menu. */
export function TopBar({ menu }: { menu: ReactNode }) {
  return (
    <header className="border-b bg-background">
      <Container className="flex h-14 items-center justify-between">
        <Link href="/dashboard" aria-label="myloopland dashboard" className="rounded-md">
          <Logo />
        </Link>
        {menu}
      </Container>
    </header>
  );
}
