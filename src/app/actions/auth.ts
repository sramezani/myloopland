"use server";

import { redirect } from "next/navigation";
import { endCurrentSession } from "@/lib/auth/session";

export async function signOut() {
  await endCurrentSession();
  redirect("/");
}
