import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageCircle } from "lucide-react";
import { auth } from "@/auth";
import { getSellerProfile } from "@/lib/listings";
import { getSlackProfile } from "@/lib/slack-profile";
import { sellerLabel, slackDmUrl } from "@/lib/format";
import { ListingCard } from "@/components/listing-card";
import { buttonVariants } from "@/components/ui/button";

const TEAM_ID = process.env.KOODIKLINIKKA_SLACK_TEAM_ID ?? "";

export const dynamic = "force-dynamic";

export default async function SellerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [profile, session] = await Promise.all([getSellerProfile(id), auth()]);

  if (!profile) {
    notFound();
  }

  const { seller, listings } = profile;
  const isSelf = session?.user?.id === seller.id;
  const identity = await getSlackProfile(seller.slackId);
  const label = sellerLabel(identity);

  return (
    <div className="flex flex-col gap-7">
      <Link
        href="/"
        className="inline-flex w-fit items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to listings
      </Link>

      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          {identity.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={identity.image}
              alt=""
              className="h-14 w-14 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="grid h-14 w-14 place-items-center rounded-full border border-border bg-surface-2 font-mono text-sm text-muted">
              {identity.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl font-extrabold tracking-tight">
              {label}
            </h1>
            <p className="font-mono text-sm text-muted">
              {listings.length} active{" "}
              {listings.length === 1 ? "listing" : "listings"}
            </p>
          </div>
        </div>

        {isSelf ? (
          <Link href="/me" className={buttonVariants({ variant: "outline" })}>
            Manage my listings
          </Link>
        ) : (
          <a
            href={slackDmUrl(TEAM_ID, seller.slackId)}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "primary" })}
          >
            <MessageCircle className="h-4 w-4" />
            Contact on Slack
          </a>
        )}
      </header>

      {listings.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-border py-20 text-center">
          <p className="font-display text-lg font-bold">
            No active listings right now.
          </p>
          <p className="text-sm text-muted">
            {isSelf
              ? "List a game and it'll show up here."
              : `${label} doesn't have anything for sale at the moment.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listings.map((listing, i) => (
            <ListingCard key={listing.id} listing={listing} priority={i < 3} />
          ))}
        </div>
      )}
    </div>
  );
}
