import "server-only";
import { prisma } from "@/lib/prisma";
import {
  listStoredImages,
  removeImages,
  type StoredImage,
} from "@/lib/storage";

// The browser uploads images before the listing is saved, so some uploads never
// get attached: the seller abandons the form, picks a different game cover, or
// resubmits after a validation error. Those files stay in storage with no
// listing pointing at them. A daily cron removes them.

// Only delete files at least this old, so an upload from a form that is still
// open is never removed before the seller submits it.
export const ORPHAN_MIN_AGE_MS = 24 * 60 * 60 * 1000;

// Storage remove() takes a list of paths; keep each request small.
const REMOVE_BATCH_SIZE = 100;

/** Stored images that no listing references and that are old enough to remove. */
export function findOrphanedImages(
  stored: StoredImage[],
  referenced: Set<string>,
  now: Date,
): string[] {
  const cutoff = now.getTime() - ORPHAN_MIN_AGE_MS;
  return stored
    .filter((img) => !referenced.has(img.path))
    .filter((img) => img.createdAt.getTime() <= cutoff)
    .map((img) => img.path);
}

export type CleanupResult = {
  stored: number;
  referenced: number;
  deleted: number;
  skipped?: string;
};

export async function cleanUpOrphanedImages(
  now = new Date(),
): Promise<CleanupResult> {
  // Read storage first: a file uploaded and attached after this point is not in
  // the list, so it can't be mistaken for an orphan.
  const stored = await listStoredImages();
  const rows = await prisma.listingImage.findMany({ select: { url: true } });
  const referenced = new Set(rows.map((row) => row.url));

  // Safety stop: if storage has images but the database has none, the app is
  // probably pointed at the wrong or an empty database. Deleting would wipe
  // every image, so do nothing.
  if (stored.length > 0 && referenced.size === 0) {
    return {
      stored: stored.length,
      referenced: 0,
      deleted: 0,
      skipped: "database has no image rows",
    };
  }

  const orphans = findOrphanedImages(stored, referenced, now);
  for (let i = 0; i < orphans.length; i += REMOVE_BATCH_SIZE) {
    await removeImages(orphans.slice(i, i + REMOVE_BATCH_SIZE));
  }
  return {
    stored: stored.length,
    referenced: referenced.size,
    deleted: orphans.length,
  };
}
