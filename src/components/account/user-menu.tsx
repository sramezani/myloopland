"use client";

import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";
import { XProfileForm } from "@/components/onboarding/x-profile-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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

type State = { error?: string; saved?: boolean; value?: string } | null;

type UserMenuProps = {
  name: string;
  email: string;
  handle: string | null;
  saveProfile: (state: State, formData: FormData) => Promise<State>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
};

/** The account menu: connect Claude, change the X profile, privacy, sign out, delete account. */
export function UserMenu({
  name,
  email,
  handle,
  saveProfile,
  signOut,
  deleteAccount,
}: UserMenuProps) {
  const [dialog, setDialog] = useState<"profile" | "delete" | null>(null);
  const close = useCallback(() => setDialog(null), []);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-lg" aria-label="Account menu">
            <MenuIcon aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel className="flex flex-col">
            <span className="truncate">{name}</span>
            <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/dashboard?connect=1#connect">Connect Claude</Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog("profile")}>
            Change X profile
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/privacy">Privacy</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => void signOut()}>Sign out</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => setDialog("delete")}>
            Delete account
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === "profile"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change X profile</DialogTitle>
            <DialogDescription>Your plan and history stay as they are.</DialogDescription>
          </DialogHeader>
          <XProfileForm
            action={saveProfile}
            defaultValue={handle ? `x.com/${handle}` : ""}
            onSaved={close}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === "delete"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This removes your plan, drafts, posts, numbers, notes and reviews for good, and
              disconnects Claude. It can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Keep my account
            </Button>
            <form action={deleteAccount}>
              <Button type="submit" variant="destructive" className="w-full">
                Delete everything
              </Button>
            </form>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
