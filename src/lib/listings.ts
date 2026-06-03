import { prisma } from "@/lib/prisma";

export type ListingFilters = {
  q?: string;
  platform?: string;
};

const withImagesAndSeller = {
  images: { orderBy: { sortOrder: "asc" } },
  seller: true,
} as const;

export async function getActiveListings(filters: ListingFilters = {}) {
  return prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      ...(filters.q
        ? { title: { contains: filters.q, mode: "insensitive" as const } }
        : {}),
      ...(filters.platform ? { platform: filters.platform } : {}),
    },
    include: withImagesAndSeller,
    orderBy: { createdAt: "desc" },
  });
}

export async function getListing(id: string) {
  return prisma.listing.findUnique({
    where: { id },
    include: withImagesAndSeller,
  });
}

export async function getListingsBySeller(sellerId: string) {
  return prisma.listing.findMany({
    where: { sellerId },
    include: withImagesAndSeller,
    orderBy: { createdAt: "desc" },
  });
}

/** Distinct platforms among active listings, for the filter dropdown. */
export async function getActivePlatforms(): Promise<string[]> {
  const rows = await prisma.listing.findMany({
    where: { status: "ACTIVE", platform: { not: null } },
    distinct: ["platform"],
    select: { platform: true },
    orderBy: { platform: "asc" },
  });
  return rows.map((r) => r.platform).filter((p): p is string => Boolean(p));
}

/**
 * Fetch a listing and assert the given user owns it. This is THE IDOR guard —
 * every owner mutation calls it. Throws if missing or not owned.
 */
export async function getOwnedListingOrThrow(id: string, userId: string) {
  const listing = await prisma.listing.findUnique({
    where: { id },
    include: { images: true },
  });
  if (!listing) {
    throw new Error("Listing not found");
  }
  if (listing.sellerId !== userId) {
    throw new Error("You do not have permission to modify this listing");
  }
  return listing;
}
