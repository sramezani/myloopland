"use server";

import { redirect } from "next/navigation";
import { deleteAccount } from "@/lib/account/account";
import { endCurrentSession, requireUser } from "@/lib/auth/session";

/** Deletes the account and everything in it (the tables cascade), then signs out. */
export async function deleteAccountAction() {
  const user = await requireUser();
  await deleteAccount(user.id);
  await endCurrentSession();
  redirect("/");
}
