import { describe, it, expect, beforeEach, vi } from "vitest";

// Image paths come from the client and are deleted with the service-role key.
// These tests check that a member can never attach, or delete, an image that
// lives in another member's storage folder.
const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  deleteListingRow: vi.fn(),
  deleteManyImages: vi.fn(),
  transaction: vi.fn(),
  deleteImages: vi.fn(),
}));

vi.mock("@/lib/session", () => ({
  requireUser: vi.fn(async () => ({ id: "user-1", slackId: "U1" })),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    listing: {
      findUnique: mocks.findUnique,
      create: mocks.create,
      update: mocks.update,
      delete: mocks.deleteListingRow,
    },
    listingImage: { deleteMany: mocks.deleteManyImages },
    $transaction: mocks.transaction,
  },
}));
vi.mock("@/lib/storage", () => ({ deleteImages: mocks.deleteImages }));
vi.mock("@/lib/slack", () => ({ announceNewListing: vi.fn() }));
vi.mock("@/lib/slack-profile", () => ({
  getSlackProfile: vi.fn(async () => ({ name: "Test", handle: null, image: null })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

import { createListing, deleteListing, updateListing } from "./actions";

const OWN = "listings/user-1/own.jpg";
const FOREIGN = "listings/user-2/victim.jpg";

function form(imagePaths: string[]): FormData {
  const fd = new FormData();
  fd.set("title", "Zelda");
  fd.set("description", "Good condition.");
  fd.set("priceEuros", "25");
  for (const path of imagePaths) fd.append("imagePaths", path);
  return fd;
}

function ownedListing(imageUrls: string[]) {
  return {
    id: "listing-1",
    sellerId: "user-1",
    images: imageUrls.map((url) => ({ url })),
  };
}

beforeEach(() => {
  for (const mock of Object.values(mocks)) mock.mockReset();
  mocks.create.mockResolvedValue({
    id: "listing-1",
    title: "Zelda",
    description: "Good condition.",
    priceCents: 2500,
    platform: null,
  });
});

describe("createListing — image path ownership", () => {
  it("rejects another member's image path", async () => {
    await expect(createListing(undefined, form([FOREIGN]))).resolves.toEqual({
      error: "Invalid image path",
    });
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("accepts the member's own image path", async () => {
    await expect(createListing(undefined, form([OWN]))).rejects.toThrow(
      "NEXT_REDIRECT",
    );
    expect(mocks.create).toHaveBeenCalledOnce();
  });
});

describe("updateListing — image path ownership", () => {
  it("rejects adding another member's image path", async () => {
    mocks.findUnique.mockResolvedValue(ownedListing([OWN]));
    await expect(
      updateListing("listing-1", undefined, form([OWN, FOREIGN])),
    ).resolves.toEqual({ error: "Invalid image path" });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("deletes a removed image only when it is in the member's folder", async () => {
    // A foreign path already stored on the listing (for example, attached
    // before this check existed) may be dropped from the listing, but its
    // storage object must not be deleted.
    mocks.findUnique.mockResolvedValue(ownedListing([OWN, FOREIGN]));
    await expect(
      updateListing("listing-1", undefined, form([])),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.deleteImages).toHaveBeenCalledWith([OWN]);
  });
});

describe("deleteListing — image cleanup", () => {
  it("deletes only images in the member's own folder", async () => {
    mocks.findUnique.mockResolvedValue(ownedListing([OWN, FOREIGN]));
    await expect(deleteListing("listing-1")).rejects.toThrow("NEXT_REDIRECT");
    expect(mocks.deleteImages).toHaveBeenCalledWith([OWN]);
    expect(mocks.deleteListingRow).toHaveBeenCalledOnce();
  });
});
