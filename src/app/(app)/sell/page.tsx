import { ListingForm } from "@/components/listing-form";
import { createListing } from "@/app/(app)/listings/actions";

export default function SellPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-7 flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          New listing
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          Sell a game
        </h1>
        <p className="text-muted">
          Buyers will reach you over Slack, so keep your DMs open.
        </p>
      </header>
      <ListingForm
        action={createListing}
        allowImages
        showGameFinder
        submitLabel="Publish listing"
      />
    </div>
  );
}
