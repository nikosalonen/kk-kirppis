import Link from "next/link";
import { Search } from "lucide-react";
import { getActiveListings, getActivePlatforms } from "@/lib/listings";
import { groupPlatforms } from "@/lib/platforms";
import { ListingGrid } from "@/components/listing-card";
import { RememberBrowseUrl } from "@/components/browse-memory";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  q?: string;
  platform?: string;
}>;

// Home-page URL for a filter combination, dropping empty params.
function filterHref(q: string | undefined, platform: string | undefined) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (platform) params.set("platform", platform);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  // The URL carries the platform's display label ("Switch"); it expands to
  // every stored spelling of it. An unknown label still matches exactly.
  const platform = sp.platform?.trim() || undefined;

  const platformGroups = groupPlatforms(await getActivePlatforms());
  const selectedGroup = platformGroups.find((g) => g.label === platform);
  const listings = await getActiveListings({
    q,
    platforms: platform ? (selectedGroup?.values ?? [platform]) : undefined,
  });

  const hasFilters = Boolean(q || platform);
  const count = listings.length;
  const chips = [
    { label: "All platforms", value: undefined },
    ...platformGroups.map((g) => ({ label: g.label, value: g.label })),
  ];

  return (
    <div className="flex flex-col gap-6">
      <RememberBrowseUrl href={filterHref(q, platform)} />
      <div className="flex flex-col gap-4">
        <form method="get" className="flex gap-2">
          {platform ? (
            <input type="hidden" name="platform" value={platform} />
          ) : null}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search titles"
              className="pl-9"
              aria-label="Search titles"
            />
          </div>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>

        {platformGroups.length > 0 ? (
          <nav
            aria-label="Filter by platform"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
          >
            {chips.map(({ label, value }) => {
              const active = value === platform;
              return (
                <Link
                  key={label}
                  href={filterHref(q, value)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-sm transition-colors",
                    active
                      ? "border-ink bg-ink text-on-ink"
                      : "border-border bg-surface text-ink hover:border-ink/40",
                  )}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">
          {count === 0 && !hasFilters
            ? "Nothing for sale yet"
            : `${count} ${count === 1 ? "game" : "games"} for sale`}
        </h1>
        {hasFilters ? (
          <Link
            href="/"
            className="text-sm text-muted underline underline-offset-4 hover:text-ink"
          >
            Clear filters
          </Link>
        ) : null}
      </div>

      {count === 0 ? (
        <div className="flex flex-col items-start gap-4 py-8">
          <p className="max-w-md text-muted">
            {hasFilters
              ? "No games match this search. Try another title or platform."
              : "Got a game you've finished with? List it and it will show up here."}
          </p>
          {hasFilters ? null : (
            <Link href="/sell" className={buttonVariants({ variant: "primary" })}>
              Sell a game
            </Link>
          )}
        </div>
      ) : (
        <ListingGrid listings={listings} />
      )}
    </div>
  );
}
