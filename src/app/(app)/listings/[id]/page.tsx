import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageCircle, Pencil } from "lucide-react";
import { auth } from "@/auth";
import { getListing } from "@/lib/listings";
import { getSlackProfile } from "@/lib/slack-profile";
import { formatListedAgo, sellerLabel, slackDmUrl } from "@/lib/format";
import { publicImageUrl } from "@/lib/image-url";
import { resolvePlatform } from "@/lib/platforms";
import { buttonVariants } from "@/components/ui/button";
import { ImageGallery } from "@/components/image-gallery";
import { PriceSticker } from "@/components/price-sticker";
import { SubmitButton } from "@/components/submit-button";
import { BackToListings } from "@/components/browse-memory";
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
  const label = sellerLabel(seller);

  return (
    <div className="flex flex-col gap-6">
      <BackToListings />

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <ImageGallery
          images={listing.images.map((img) => publicImageUrl(img.url))}
          title={listing.title}
          sold={sold}
        />

        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            {platform ? (
              platform.logoUrl ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-md bg-white px-2 py-1 ring-1 ring-border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={platform.logoUrl}
                    alt=""
                    className="h-4 w-auto max-w-[56px] object-contain"
                  />
                  <span className="text-xs font-medium text-zinc-900">
                    {platform.label}
                  </span>
                </span>
              ) : (
                <span className="text-sm text-muted">{platform.label}</span>
              )
            ) : null}

            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
              {listing.title}
            </h1>

            <PriceSticker
              priceCents={listing.priceCents}
              sold={sold}
              size="lg"
              className="mt-1 w-fit"
            />
          </div>

          {isOwner ? (
            <section className="flex flex-col gap-3 rounded-[var(--radius)] border border-border bg-surface p-4">
              <p className="text-sm text-muted">
                {sold
                  ? "This is your listing. It's marked as sold, so it's hidden from browsing."
                  : "This is your listing. Buyers can see it and message you on Slack."}
              </p>
              <div className="flex flex-wrap gap-2">
                <form
                  action={setListingStatus.bind(
                    null,
                    listing.id,
                    sold ? "ACTIVE" : "SOLD",
                  )}
                >
                  <SubmitButton variant={sold ? "outline" : "primary"}>
                    {sold ? "Mark as available" : "Mark as sold"}
                  </SubmitButton>
                </form>
                <Link
                  href={`/listings/${listing.id}/edit`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Pencil className="h-4 w-4" />
                  Edit
                </Link>
                <DeleteListingButton
                  action={deleteListing.bind(null, listing.id)}
                />
              </div>
            </section>
          ) : sold ? (
            <p className="text-muted">
              This game has been sold.{" "}
              <Link
                href={`/sellers/${listing.sellerId}`}
                className="text-ink underline underline-offset-4"
              >
                See what else {label} is selling
              </Link>
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <a
                href={slackDmUrl(TEAM_ID, listing.seller.slackId)}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonVariants({
                  variant: "primary",
                  size: "lg",
                  className: "sm:w-fit",
                })}
              >
                <MessageCircle className="h-5 w-5" />
                Message {label} on Slack
              </a>
              <p className="text-sm text-muted">
                Opens a direct message in the Koodiklinikka Slack.
              </p>
            </div>
          )}

          <p className="max-w-prose whitespace-pre-wrap leading-relaxed text-ink/90">
            {listing.description}
          </p>

          <div className="flex items-center gap-3 border-t border-border pt-5">
            {seller.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={seller.image}
                alt=""
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <span className="grid h-10 w-10 place-items-center rounded-full bg-surface-2 text-xs font-medium text-muted">
                {seller.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            <div className="text-sm">
              <Link
                href={`/sellers/${listing.sellerId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {label}
              </Link>
              <div className="text-muted">
                Listed {formatListedAgo(listing.createdAt)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
