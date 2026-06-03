"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getOwnedListingOrThrow } from "@/lib/listings";
import { prisma } from "@/lib/prisma";
import { deleteImages } from "@/lib/storage";
import { eurosToCents, listingInputSchema } from "@/lib/validation";

export type FormState = { error?: string } | undefined;

function parseListing(formData: FormData) {
  return listingInputSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    priceEuros: formData.get("priceEuros"),
    condition: formData.get("condition"),
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
      condition: data.condition,
      category: data.category,
      platform: data.platform ? data.platform : null,
      sellerId: user.id,
      images: {
        create: data.imagePaths.map((url, sortOrder) => ({ url, sortOrder })),
      },
    },
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
      condition: data.condition,
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
