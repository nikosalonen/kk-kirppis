import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import type { Listing, ListingImage, User } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { CONDITION_LABELS, formatPrice } from "@/lib/format";
import { publicImageUrl } from "@/lib/image-url";

type CardListing = Pick<
  Listing,
  "id" | "title" | "priceCents" | "condition" | "platform" | "status"
> & {
  images: Pick<ListingImage, "url">[];
  seller: Pick<User, "name" | "image">;
};

export function ListingCard({ listing }: { listing: CardListing }) {
  const cover = listing.images[0];
  const sold = listing.status === "SOLD";

  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group relative flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface transition-all duration-150 hover:-translate-y-1 hover:border-accent/50 hover:shadow-hard-accent"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
        {cover ? (
          <Image
            src={publicImageUrl(cover.url)}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            className={`object-cover transition-transform duration-300 group-hover:scale-105 ${
              sold ? "opacity-40 grayscale" : ""
            }`}
          />
        ) : (
          <div className="grid h-full place-items-center text-border">
            <ImageOff className="h-10 w-10" />
          </div>
        )}
        {sold ? (
          <span className="absolute left-3 top-3 rounded-md bg-danger px-2 py-0.5 font-mono text-xs font-bold uppercase tracking-widest text-accent-ink">
            Sold
          </span>
        ) : null}
        {listing.platform ? (
          <span className="absolute right-3 top-3 rounded-md bg-bg/80 px-2 py-0.5 font-mono text-xs uppercase tracking-wider text-ink backdrop-blur-sm">
            {listing.platform}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h3 className="line-clamp-2 font-display text-base font-bold leading-snug tracking-tight text-ink">
          {listing.title}
        </h3>
        <div className="flex items-center gap-1.5 text-xs text-muted">
          {listing.seller.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.seller.image}
              alt=""
              className="h-4 w-4 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="grid h-4 w-4 place-items-center rounded-full border border-border bg-surface-2 text-[8px] font-mono">
              {listing.seller.name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="truncate">{listing.seller.name}</span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2">
          <span className="font-mono text-lg font-bold text-accent">
            {formatPrice(listing.priceCents)}
          </span>
          <Badge>{CONDITION_LABELS[listing.condition]}</Badge>
        </div>
      </div>
    </Link>
  );
}
