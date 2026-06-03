import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the Prisma client so the guard's authorization logic can be tested
// without a database. This is the IDOR choke point every mutation calls.
const { findUnique } = vi.hoisted(() => ({ findUnique: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: { listing: { findUnique } },
}));

import { getOwnedListingOrThrow } from "@/lib/listings";

describe("getOwnedListingOrThrow — ownership / IDOR guard", () => {
  beforeEach(() => findUnique.mockReset());

  it("throws when the listing does not exist", async () => {
    findUnique.mockResolvedValue(null);
    await expect(getOwnedListingOrThrow("missing", "user-1")).rejects.toThrow(
      /not found/i,
    );
  });

  it("throws when the requester is not the owner (the IDOR case)", async () => {
    findUnique.mockResolvedValue({
      id: "listing-1",
      sellerId: "owner-1",
      images: [],
    });
    await expect(
      getOwnedListingOrThrow("listing-1", "attacker-2"),
    ).rejects.toThrow(/permission/i);
  });

  it("returns the listing when the requester owns it", async () => {
    const listing = { id: "listing-1", sellerId: "user-1", images: [] };
    findUnique.mockResolvedValue(listing);
    await expect(getOwnedListingOrThrow("listing-1", "user-1")).resolves.toBe(
      listing,
    );
  });
});
