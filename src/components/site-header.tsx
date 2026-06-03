import Link from "next/link";
import { Gamepad2, Plus } from "lucide-react";
import { signOutAction } from "@/app/(app)/auth-actions";
import { Button, buttonVariants } from "@/components/ui/button";

export function SiteHeader({
  user,
}: {
  user: { name?: string | null; image?: string | null };
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-accent-ink shadow-hard transition-transform group-hover:-translate-y-px">
            <Gamepad2 className="h-5 w-5" strokeWidth={2.5} />
          </span>
          <span className="font-display text-lg font-extrabold leading-none tracking-tight">
            KK<span className="text-accent">·</span>Kirppis
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link
            href="/me"
            className={buttonVariants({ variant: "ghost", size: "sm" })}
          >
            My listings
          </Link>
          <Link
            href="/sell"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            Sell a game
          </Link>

          <div className="ml-1 flex items-center gap-2 border-l border-border pl-3">
            {user.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.image}
                alt=""
                className="h-8 w-8 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="grid h-8 w-8 place-items-center rounded-full border border-border bg-surface-2 font-mono text-xs text-muted">
                {(user.name ?? "?").slice(0, 2).toUpperCase()}
              </span>
            )}
            <form action={signOutAction}>
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </nav>
      </div>
    </header>
  );
}
