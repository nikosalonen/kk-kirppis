import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getListing } from "@/lib/listings";
import { ListingForm } from "@/components/listing-form";
import { updateListing } from "@/app/(app)/listings/actions";

export const dynamic = "force-dynamic";

export default async function EditListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const listing = await getListing(id);

  // Only the owner may open the edit form (the action re-checks too).
  if (!listing || listing.sellerId !== user.id) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <header className="mb-7 flex flex-col gap-2">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
          Editing
        </span>
        <h1 className="font-display text-3xl font-extrabold tracking-tight">
          {listing.title}
        </h1>
        <p className="text-muted">
          Photos are set when a listing is created and can&apos;t be changed
          here.
        </p>
      </header>
      <ListingForm
        action={updateListing.bind(null, listing.id)}
        defaults={{
          title: listing.title,
          description: listing.description,
          priceEuros: (listing.priceCents / 100).toString(),
          condition: listing.condition,
          platform: listing.platform ?? "",
        }}
        submitLabel="Save changes"
      />
    </div>
  );
}
