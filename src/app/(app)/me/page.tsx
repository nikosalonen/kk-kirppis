import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getListingsBySeller } from "@/lib/listings";
import { ListingGrid } from "@/components/listing-card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MyListingsPage() {
  const user = await requireUser();
  const listings = await getListingsBySeller(user.id);

  const forSale = listings.filter((l) => l.status === "ACTIVE");
  const sold = listings.filter((l) => l.status === "SOLD");

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          My listings
        </h1>
        <Link href="/sell" className={buttonVariants({ variant: "primary" })}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Sell a game
        </Link>
      </header>

      {listings.length === 0 ? (
        <p className="text-muted">
          You haven&apos;t listed anything yet. Games you list will show up
          here.
        </p>
      ) : (
        <>
          <section className="flex flex-col gap-4">
            <h2 className="text-lg font-bold">For sale ({forSale.length})</h2>
            {forSale.length === 0 ? (
              <p className="text-muted">Nothing for sale right now.</p>
            ) : (
              <ListingGrid listings={forSale} />
            )}
          </section>

          {sold.length > 0 ? (
            <section className="flex flex-col gap-4 border-t border-border pt-8">
              <h2 className="text-lg font-bold">Sold ({sold.length})</h2>
              <p className="-mt-2 text-sm text-muted">
                Sold games are hidden from browsing. Open one to mark it as
                available again.
              </p>
              <ListingGrid listings={sold} />
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
