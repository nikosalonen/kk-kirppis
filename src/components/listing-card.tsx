import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { Listing, ListingImage, User } from "@prisma/client";
import { formatListedAgo, sellerLabel } from "@/lib/format";
import { publicImageUrl } from "@/lib/image-url";
import { resolvePlatform } from "@/lib/platforms";
import { getSlackProfile } from "@/lib/slack-profile";
import { PriceSticker } from "@/components/price-sticker";

type CardListing = Pick<
  Listing,
  "id" | "title" | "priceCents" | "platform" | "status" | "createdAt"
> & {
  images: Pick<ListingImage, "url">[];
  seller: Pick<User, "slackId">;
};

// The cover sits straight on the page like a game case on a shelf, with the
// price on a sticker in its corner. No card box around it.
export async function ListingCard({
  listing,
  priority = false,
}: {
  listing: CardListing;
  // Set for the first cards on the page (ListingGrid marks 4, one row on wide
  // screens) so the LCP image preloads.
  priority?: boolean;
}) {
  const cover = listing.images[0];
  const sold = listing.status === "SOLD";
  const platform = resolvePlatform(listing.platform);
  const seller = await getSlackProfile(listing.seller.slackId);

  return (
    <Link href={`/listings/${listing.id}`} className="group flex flex-col gap-2.5">
      <div className="relative">
        <div className="relative aspect-[3/4] overflow-hidden rounded-[4px] bg-surface-2 ring-1 ring-border">
          {cover ? (
            <Image
              src={publicImageUrl(cover.url)}
              alt=""
              fill
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 270px"
              className={`object-cover ${sold ? "opacity-50 grayscale" : ""}`}
            />
          ) : (
            <div className="grid h-full place-items-center text-muted">
              <ImageOff className="h-10 w-10" />
            </div>
          )}
        </div>
        <PriceSticker
          priceCents={listing.priceCents}
          sold={sold}
          className="absolute right-2 top-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <h3 className="line-clamp-2 font-semibold leading-snug text-ink group-hover:underline">
          {listing.title}
        </h3>
        {platform ? (
          <p className="text-sm text-muted">{platform.label}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2 text-xs text-muted">
          <span className="flex min-w-0 items-center gap-1.5">
            {seller.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.image}
                alt=""
                className="h-4 w-4 shrink-0 rounded-full object-cover"
              />
            ) : null}
            <span className="truncate">{sellerLabel(seller)}</span>
          </span>
          <span className="shrink-0">{formatListedAgo(listing.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ListingGrid({ listings }: { listings: CardListing[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
      {listings.map((listing, i) => (
        <ListingCard key={listing.id} listing={listing} priority={i < 4} />
      ))}
    </div>
  );
}
