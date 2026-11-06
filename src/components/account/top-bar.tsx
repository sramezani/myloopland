import { CalendarDaysIcon, LinkIcon } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Container } from "@/components/shared/container";
import { Logo } from "@/components/shared/logo";
import { cn } from "@/lib/utils";

export type Section = "calendar" | "backlinks";

const SECTIONS: { key: Section; href: Route; label: string; Icon: typeof LinkIcon }[] = [
  { key: "calendar", href: "/dashboard", label: "Calendar", Icon: CalendarDaysIcon },
  { key: "backlinks", href: "/dashboard/backlinks", label: "Backlinks", Icon: LinkIcon },
];

/**
 * The signed-in pages' top bar (docs/SPEC.md section 8): the logo, the section tabs and the
 * account menu. Below 640 px the tabs get their own row under the logo. Without `current`
 * (before the X profile is added) there are no tabs, so the first screen has one job.
 */
export function TopBar({ menu, current }: { menu: ReactNode; current?: Section }) {
  return (
    <header className="border-b bg-background">
      <Container className="flex flex-wrap items-center justify-between gap-x-6">
        <Link
          href="/dashboard"
          aria-label="myloopland dashboard"
          className="flex h-14 items-center rounded-md"
        >
          <Logo />
        </Link>
        {current ? (
          <nav
            aria-label="Sections"
            className="order-last -mb-px -ml-3 flex w-[calc(100%+0.75rem)] gap-1 sm:order-none sm:mr-auto sm:ml-0 sm:w-auto"
          >
            {SECTIONS.map(({ key, href, label, Icon }) => {
              const active = key === current;
              return (
                <Link
                  key={key}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors sm:h-14",
                    "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full",
                    active
                      ? "text-foreground after:bg-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null}
        {menu}
      </Container>
    </header>
  );
}
