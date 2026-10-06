import { prisma } from "@/lib/prisma";

export type ListingFilters = {
  q?: string;
  // Stored platform strings to match, e.g. every spelling of "Switch".
  platforms?: string[];
};

const withImagesAndSeller = {
  images: { orderBy: { sortOrder: "asc" } },
  // Only the Slack id — display identity is resolved live via getSlackProfile.
  seller: { select: { id: true, slackId: true } },
} as const;

export async function getActiveListings(filters: ListingFilters = {}) {
  return prisma.listing.findMany({
    where: {
      status: "ACTIVE",
      ...(filters.q
        ? { title: { contains: filters.q, mode: "insensitive" as const } }
        : {}),
      ...(filters.platforms?.length
        ? { platform: { in: filters.platforms } }
        : {}),
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

/**
 * Public seller profile: the seller plus their ACTIVE listings (what a buyer
 * can actually contact them about). Returns null if the user doesn't exist.
 */
export async function getSellerProfile(sellerId: string) {
  const seller = await prisma.user.findUnique({
    where: { id: sellerId },
    select: { id: true, slackId: true },
  });
  if (!seller) return null;

  const listings = await prisma.listing.findMany({
    where: { sellerId, status: "ACTIVE" },
    include: withImagesAndSeller,
    orderBy: { createdAt: "desc" },
  });
  return { seller, listings };
}

/** Distinct stored platform strings among active listings, for the filter chips. */
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
