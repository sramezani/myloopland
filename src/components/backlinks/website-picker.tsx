"use client";

import { CheckIcon, ChevronsUpDownIcon, GlobeIcon, PlusIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { OneFieldState } from "@/components/shared/one-field-form";
import type { WebsiteItem } from "@/lib/backlinks/summary";
import { displayUrl } from "@/lib/backlinks/url";
import { WebsiteForm, websiteHref } from "./website-form";

type WebsitePickerProps = {
  websites: WebsiteItem[];
  selectedId: string;
  addWebsite: (state: OneFieldState, formData: FormData) => Promise<OneFieldState>;
};

/**
 * Which website's list is open. Each website is a link to its list; the last item adds one
 * in a small dialog.
 */
export function WebsitePicker({ websites, selectedId, addWebsite }: WebsitePickerProps) {
  const [adding, setAdding] = useState(false);
  const close = useCallback(() => setAdding(false), []);
  const selected = websites.find((site) => site.id === selectedId) ?? websites[0];
  if (!selected) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="lg"
            className="max-w-full min-w-0 shrink bg-card px-3 pointer-coarse:h-11"
          >
            <GlobeIcon className="text-muted-foreground" aria-hidden="true" />
            <span className="sr-only">Website: </span>
            <span className="truncate font-semibold">{displayUrl(selected.url)}</span>
            <ChevronsUpDownIcon className="text-muted-foreground" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64 max-w-[calc(100vw-2rem)]">
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            Your websites
          </DropdownMenuLabel>
          {websites.map((site) => {
            const current = site.id === selected.id;
            return (
              <DropdownMenuItem key={site.id} asChild className="pointer-coarse:min-h-11">
                <Link href={websiteHref(site.key)} aria-current={current ? "page" : undefined}>
                  <span className="min-w-0 flex-1 truncate">{displayUrl(site.url)}</span>
                  {current ? <CheckIcon className="text-primary" aria-hidden="true" /> : null}
                </Link>
              </DropdownMenuItem>
            );
          })}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAdding(true)} className="pointer-coarse:min-h-11">
            <PlusIcon aria-hidden="true" />
            Add website
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a website</DialogTitle>
            <DialogDescription>
              It gets its own list, starting with the same places to submit to.
            </DialogDescription>
          </DialogHeader>
          <WebsiteForm action={addWebsite} autoFocus hideLabel onAdded={close} />
        </DialogContent>
      </Dialog>
    </>
  );
}
