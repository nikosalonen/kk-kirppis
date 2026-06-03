import { redirect } from "next/navigation";
import { Gamepad2, LogIn, ShieldCheck } from "lucide-react";
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
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent text-accent-ink shadow-hard">
            <Gamepad2 className="h-7 w-7" strokeWidth={2.5} />
          </span>
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            KK<span className="text-accent">·</span>Kirppis
          </h1>
          <p className="text-balance text-muted">
            The used-game flea market for the Koodiklinikka community.
          </p>
        </div>

        <div className="flex flex-col gap-5 rounded-[var(--radius)] border border-border bg-surface p-6 shadow-hard">
          <form action={signInWithSlack}>
            <Button type="submit" size="lg" className="w-full">
              <LogIn className="h-5 w-5" />
              Sign in with Slack
            </Button>
          </form>
          <p className="flex items-start gap-2 text-sm text-muted">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            Only members of the Koodiklinikka Slack workspace can sign in. We
            never see your password — Slack handles it.
          </p>
        </div>
      </div>
    </div>
  );
}
