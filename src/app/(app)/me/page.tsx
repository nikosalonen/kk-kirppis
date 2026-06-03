import Link from "next/link";
import { Plus } from "lucide-react";
import { requireUser } from "@/lib/session";
import { getListingsBySeller } from "@/lib/listings";
import { ListingCard } from "@/components/listing-card";
import { buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function MyListingsPage() {
  const user = await requireUser();
  const listings = await getListingsBySeller(user.id);

  const active = listings.filter((l) => l.status === "ACTIVE").length;
  const sold = listings.length - active;

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-extrabold tracking-tight">
            My listings
          </h1>
          <p className="font-mono text-sm text-muted">
            {active} active · {sold} sold
          </p>
        </div>
        <Link href="/sell" className={buttonVariants({ variant: "primary" })}>
          <Plus className="h-4 w-4" strokeWidth={2.5} />
          Sell a game
        </Link>
      </header>

      {listings.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border py-20 text-center">
          <p className="font-display text-lg font-bold">No listings yet.</p>
          <p className="text-sm text-muted">
            Your games will show up here once you list them.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  );
}
