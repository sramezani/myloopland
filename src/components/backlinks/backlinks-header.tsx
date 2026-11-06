import { SparklesIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

type BacklinksHeaderProps = {
  /** The open website, as people read it. None before the first one is added. */
  website?: string;
  /** The website picker, next to the title. */
  picker?: ReactNode;
};

/** The page's title, the website picker and the way to Claude's part. */
export function BacklinksHeader({ website, picker }: BacklinksHeaderProps) {
  return (
    <header className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-3">
        <div className="flex max-w-full min-w-0 items-center gap-3">
          <h1 className="shrink-0 text-2xl font-bold tracking-tight">Backlinks</h1>
          {picker}
        </div>
        {website ? (
          // On a phone the card is a short scroll away; the header keeps to the title and picker.
          <Button asChild variant="ghost" size="lg" className="-mx-2 hidden sm:inline-flex">
            <a href="#find-more">
              <SparklesIcon aria-hidden="true" />
              Find more with Claude
            </a>
          </Button>
        ) : null}
      </div>
      <p className="text-sm text-pretty text-muted-foreground">
        {website ? (
          <>
            Places to submit <span className="font-medium text-foreground">{website}</span> to, for
            links back to it. Tick each one once you&apos;ve sent it in.
          </>
        ) : (
          "Places to submit your website to, for links back to it: launch sites, directories and communities."
        )}
      </p>
    </header>
  );
}
