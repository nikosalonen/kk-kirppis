import { redirect } from "next/navigation";
import { auth } from "@/auth";

/**
 * Resolve the signed-in member or redirect to sign-in.
 * Use in protected pages and at the top of every mutation (server action) —
 * server actions are public POST endpoints, so this is a real access control,
 * not just UX.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }
  return session.user;
}
