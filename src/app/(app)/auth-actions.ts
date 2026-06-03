"use server";

import { signIn, signOut } from "@/auth";

export async function signInWithSlack() {
  await signIn("slack", { redirectTo: "/" });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/signin" });
}
