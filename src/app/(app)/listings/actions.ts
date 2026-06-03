"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getOwnedListingOrThrow } from "@/lib/listings";
import { prisma } from "@/lib/prisma";
import { deleteImages } from "@/lib/storage";
import { announceNewListing } from "@/lib/slack";
import { getSlackProfile } from "@/lib/slack-profile";
import { sellerLabel } from "@/lib/format";
import { eurosToCents, listingInputSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

function parseListing(formData: FormData) {
  return listingInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priceEuros: formData.get("priceEuros"),
    platform: formData.get("platform") ?? "",
    category: formData.get("category") ?? "videogame",
    imagePaths: formData.getAll("imagePaths").map(String),
  });
}

export async function createListing(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  const listing = await prisma.listing.create({
    data: {
      title: data.title,
      description: data.description,
      priceCents: eurosToCents(data.priceEuros),
      category: data.category,
      platform: data.platform ? data.platform : null,
      sellerId: user.id,
      images: {
        create: data.imagePaths.map((url, sortOrder) => ({ url, sortOrder })),
      },
    },
  });

  // Best-effort community announcement (never blocks creation).
  const seller = await getSlackProfile(user.slackId);
  await announceNewListing({
    id: listing.id,
    title: listing.title,
    description: listing.description,
    priceCents: listing.priceCents,
    platform: listing.platform,
    sellerLabel: sellerLabel(seller),
    coverPath: data.imagePaths[0] ?? null,
  });

  revalidatePath("/");
  revalidatePath("/me");
  redirect(`/listings/${listing.id}`);
}

export async function updateListing(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireUser();
  await getOwnedListingOrThrow(id, user.id); // IDOR guard

  const parsed = parseListing(formData);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  // MVP: editing updates text fields only; images are set at creation time.
  await prisma.listing.update({
    where: { id },
    data: {
      title: data.title,
      description: data.description,
      priceCents: eurosToCents(data.priceEuros),
      platform: data.platform ? data.platform : null,
    },
  });

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/listings/${id}`);
  redirect(`/listings/${id}`);
}

export async function setListingStatus(
  id: string,
  status: "ACTIVE" | "SOLD",
): Promise<void> {
  const user = await requireUser();
  await getOwnedListingOrThrow(id, user.id); // IDOR guard

  await prisma.listing.update({ where: { id }, data: { status } });

  revalidatePath("/");
  revalidatePath("/me");
  revalidatePath(`/listings/${id}`);
}

export async function deleteListing(id: string): Promise<void> {
  const user = await requireUser();
  const listing = await getOwnedListingOrThrow(id, user.id); // IDOR guard

  // Best-effort storage cleanup before the rows cascade away.
  await deleteImages(listing.images.map((img) => img.url));
  await prisma.listing.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/me");
  redirect("/me");
}
