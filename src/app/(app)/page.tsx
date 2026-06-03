import Link from "next/link";
import { Search, PackageOpen } from "lucide-react";
import { getActiveListings, getActivePlatforms } from "@/lib/listings";
import { ListingCard } from "@/components/listing-card";
import { Input, Select } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  platform?: string;
}>;

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const platform = sp.platform?.trim() || undefined;

  const [listings, platforms] = await Promise.all([
    getActiveListings({ q, platform }),
    getActivePlatforms(),
  ]);

  const hasFilters = Boolean(q || platform);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Koodiklinikka · used games
        </span>
        <h1 className="max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
          Give your games a{" "}
          <span className="text-accent">second player.</span>
        </h1>
        <p className="max-w-xl text-muted">
          Browse what the community is selling, or list your own shelf-dwellers.
          Deals happen over Slack — no fees, no middlemen.
        </p>
      </section>

      <form
        method="get"
        className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface/60 p-3 sm:flex-row sm:items-center"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search titles…"
            className="pl-9"
            aria-label="Search titles"
          />
        </div>
        <Select
          name="platform"
          defaultValue={platform ?? ""}
          aria-label="Platform"
          className="sm:w-44"
          disabled={platforms.length === 0}
        >
          <option value="">Any platform</option>
          {platforms.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </Select>
        <div className="flex gap-2">
          <Button type="submit">Filter</Button>
          {hasFilters ? (
            <Link
              href="/"
              className={buttonVariants({ variant: "outline", size: "md" })}
            >
              Clear
            </Link>
          ) : null}
        </div>
      </form>

      {listings.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-[var(--radius)] border border-dashed border-border py-20 text-center">
          <PackageOpen className="h-10 w-10 text-muted" />
          <div>
            <p className="font-display text-lg font-bold">
              {hasFilters ? "No games match those filters." : "Nothing listed yet."}
            </p>
            <p className="text-sm text-muted">
              {hasFilters
                ? "Try widening your search."
                : "Be the first to list a game."}
            </p>
          </div>
          <Link href="/sell" className={buttonVariants({ variant: "primary" })}>
            Sell a game
          </Link>
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
