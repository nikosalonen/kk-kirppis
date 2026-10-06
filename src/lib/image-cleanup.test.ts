import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  listStoredImages: vi.fn(),
  removeImages: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: { listingImage: { findMany: mocks.findMany } },
}));
vi.mock("@/lib/storage", () => ({
  listStoredImages: mocks.listStoredImages,
  removeImages: mocks.removeImages,
}));

import {
  cleanUpOrphanedImages,
  findOrphanedImages,
  ORPHAN_MIN_AGE_MS,
} from "@/lib/image-cleanup";

const NOW = new Date("2026-10-06T06:30:00Z");
const OLD = new Date(NOW.getTime() - ORPHAN_MIN_AGE_MS - 1);
const FRESH = new Date(NOW.getTime() - 60_000);

describe("findOrphanedImages", () => {
  it("returns only unreferenced images older than the minimum age", () => {
    const stored = [
      { path: "listings/u/kept.jpg", createdAt: OLD },
      { path: "listings/u/orphan.jpg", createdAt: OLD },
      { path: "listings/u/in-progress.jpg", createdAt: FRESH },
    ];
    const referenced = new Set(["listings/u/kept.jpg"]);
    expect(findOrphanedImages(stored, referenced, NOW)).toEqual([
      "listings/u/orphan.jpg",
    ]);
  });
});

describe("cleanUpOrphanedImages", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("removes orphans in batches of 100", async () => {
    const orphans = Array.from({ length: 150 }, (_, i) => ({
      path: `listings/u/${i}.jpg`,
      createdAt: OLD,
    }));
    mocks.listStoredImages.mockResolvedValue([
      { path: "listings/u/kept.jpg", createdAt: OLD },
      ...orphans,
    ]);
    mocks.findMany.mockResolvedValue([{ url: "listings/u/kept.jpg" }]);

    const result = await cleanUpOrphanedImages(NOW);

    expect(result).toEqual({ stored: 151, referenced: 1, deleted: 150 });
    expect(mocks.removeImages).toHaveBeenCalledTimes(2);
    expect(mocks.removeImages.mock.calls[0][0]).toHaveLength(100);
    expect(mocks.removeImages.mock.calls[1][0]).toHaveLength(50);
  });

  it("deletes nothing when the database has no image rows", async () => {
    mocks.listStoredImages.mockResolvedValue([
      { path: "listings/u/a.jpg", createdAt: OLD },
    ]);
    mocks.findMany.mockResolvedValue([]);

    const result = await cleanUpOrphanedImages(NOW);

    expect(result.deleted).toBe(0);
    expect(result.skipped).toBeDefined();
    expect(mocks.removeImages).not.toHaveBeenCalled();
  });
});
