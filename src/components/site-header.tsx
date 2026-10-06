import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export function SiteHeader({
  user,
}: {
  user: { name?: string | null; image?: string | null };
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <Link
          href="/"
          className="font-display text-xl font-extrabold leading-none tracking-tight"
        >
          KK-Kirppis
        </Link>

        <nav className="flex items-center gap-3">
          <Link
            href="/sell"
            className={buttonVariants({ variant: "primary", size: "sm" })}
          >
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            <span className="sm:hidden">Sell</span>
            <span className="hidden sm:inline">Sell a game</span>
          </Link>
          <UserMenu name={user.name} image={user.image} />
        </nav>
      </div>
    </header>
  );
}
