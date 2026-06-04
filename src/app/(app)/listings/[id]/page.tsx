import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { getListing } from "@/lib/listings";
import { getSlackProfile } from "@/lib/slack-profile";
import { formatPrice, sellerLabel, slackDmUrl } from "@/lib/format";
import { publicImageUrl } from "@/lib/image-url";
import { resolvePlatform } from "@/lib/platforms";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { ImageGallery } from "@/components/image-gallery";
import { deleteListing, setListingStatus } from "@/app/(app)/listings/actions";
import { DeleteListingButton } from "@/components/delete-listing-button";

const TEAM_ID = process.env.KOODIKLINIKKA_SLACK_TEAM_ID ?? "";

export const dynamic = "force-dynamic";

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [listing, session] = await Promise.all([getListing(id), auth()]);

  if (!listing) {
    notFound();
  }

  const isOwner = session?.user?.id === listing.sellerId;
  const sold = listing.status === "SOLD";
  const platform = resolvePlatform(listing.platform);
  const seller = await getSlackProfile(listing.seller.slackId);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        {/* Gallery */}
        <ImageGallery
          images={listing.images.map((img) => publicImageUrl(img.url))}
          title={listing.title}
          sold={sold}
        />

        {/* Details */}
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={sold ? "danger" : "accent"}>
              {sold ? "Sold" : "Available"}
            </Badge>
            {platform ? (
              platform.logoUrl ? (
                <span className="inline-flex items-center gap-1.5 rounded-md bg-white/90 px-2 py-1 shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={platform.logoUrl}
                    alt=""
                    className="h-4 w-auto max-w-[56px] object-contain"
                  />
                  <span className="font-mono text-xs font-medium uppercase tracking-wider text-bg">
                    {platform.label}
                  </span>
                </span>
              ) : (
                <Badge>{platform.label}</Badge>
              )
            ) : null}
          </div>

          <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
            {listing.title}
          </h1>

          <div className="font-mono text-4xl font-bold text-accent">
            {formatPrice(listing.priceCents)}
          </div>

          <p className="whitespace-pre-wrap leading-relaxed text-ink/90">
            {listing.description}
          </p>

          <Link
            href={`/sellers/${listing.sellerId}`}
            className="group mt-2 flex items-center gap-3 border-t border-border pt-5"
          >
            {seller.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.image}
                alt=""
                className="h-10 w-10 rounded-full border border-border object-cover"
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface-2 font-mono text-xs text-muted">
                {seller.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="text-sm">
              <div className="font-medium group-hover:text-accent">
                {sellerLabel(seller)}
              </div>
              <div className="text-muted">View all listings →</div>
            </div>
          </Link>

          {/* Actions */}
          {isOwner ? (
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/listings/${listing.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <form
                action={setListingStatus.bind(
                  null,
                  listing.id,
                  sold ? "ACTIVE" : "SOLD",
                )}
              >
                <Button variant="outline" type="submit">
                  {sold ? "Mark as available" : "Mark as sold"}
                </Button>
              </form>
              <DeleteListingButton
                action={deleteListing.bind(null, listing.id)}
              />
            </div>
          ) : (
            <a
              href={slackDmUrl(TEAM_ID, listing.seller.slackId)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "primary", size: "lg" })}
            >
              <MessageCircle className="h-5 w-5" />
              Contact {sellerLabel(seller)} on Slack
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
