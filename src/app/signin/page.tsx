import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn } from "lucide-react";
import { auth } from "@/auth";
import { signInWithSlack } from "@/app/(app)/auth-actions";
import { Button } from "@/components/ui/button";

export default async function SignInPage() {
  const session = await auth();
  if (session?.user?.id) {
    redirect("/");
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-3">
          <h1 className="font-display text-4xl font-extrabold tracking-tight">
            KK-Kirppis
          </h1>
          <p className="text-muted">
            Buy and sell used games with other Koodiklinikka members. Deals
            happen in Slack DMs, with no fees.
          </p>
        </div>

        <form action={signInWithSlack}>
          <Button type="submit" size="lg" className="w-full">
            <LogIn className="h-5 w-5" />
            Sign in with Slack
          </Button>
        </form>

        <p className="text-sm text-muted">
          Only members of the Koodiklinikka Slack workspace can sign in. Slack
          handles your password, so we never see it.{" "}
          <Link
            href="/privacy"
            className="text-ink underline underline-offset-4"
          >
            Privacy policy
          </Link>
        </p>
      </div>
    </div>
  );
}
