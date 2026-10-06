import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { userImagePrefix } from "@/lib/validation";

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "listing-images";
export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

let cached: SupabaseClient | null = null;

// Service-role client. SERVER ONLY — the key is never NEXT_PUBLIC, so it is
// never sent to the browser, and `server-only` makes a client import fail.
function admin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set",
    );
  }
  cached = createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
  return cached;
}

export type UploadTarget = {
  path: string;
  signedUrl: string;
};

/**
 * Create signed upload URLs for a member's images. The client PUTs files
 * directly to these URLs (no large-file proxying through the function).
 * Defence in depth: the Supabase bucket must also be configured with a
 * file-size limit and an allowed-mime-type list (see README), because the
 * direct upload bypasses this function.
 */
export async function createImageUploadTargets(
  userId: string,
  contentTypes: string[],
): Promise<UploadTarget[]> {
  const client = admin();
  const targets: UploadTarget[] = [];
  for (const type of contentTypes) {
    const ext = EXT_BY_TYPE[type];
    if (!ext) {
      throw new Error(`Unsupported image type: ${type}`);
    }
    const path = `${userImagePrefix(userId)}${randomUUID()}.${ext}`;
    const { data, error } = await client.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);
    if (error || !data) {
      throw new Error(`Failed to create upload URL: ${error?.message}`);
    }
    targets.push({ path, signedUrl: data.signedUrl });
  }
  return targets;
}

/** Best-effort removal of storage objects when a listing is deleted. */
export async function deleteImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  // Best-effort: never throw (deletion must still succeed), but surface a
  // failure so orphaned objects don't pile up silently.
  const { error } = await admin().storage.from(BUCKET).remove(paths);
  if (error) {
    console.error("[storage] image cleanup failed:", error.message);
  }
}

export type StoredImage = { path: string; createdAt: Date };

// Storage's list() returns at most `limit` entries, so read folders page by page.
const LIST_PAGE_SIZE = 1000;

async function listFolder(prefix: string) {
  const entries = [];
  for (let offset = 0; ; offset += LIST_PAGE_SIZE) {
    const { data, error } = await admin()
      .storage.from(BUCKET)
      .list(prefix, { limit: LIST_PAGE_SIZE, offset });
    if (error) {
      throw new Error(`Failed to list ${prefix}: ${error.message}`);
    }
    entries.push(...data);
    if (data.length < LIST_PAGE_SIZE) return entries;
  }
}

/**
 * Every image in the bucket. Images live at listings/<userId>/<file>, and
 * list() reads one folder level at a time (subfolders come back with id null).
 */
export async function listStoredImages(): Promise<StoredImage[]> {
  const images: StoredImage[] = [];
  for (const folder of await listFolder("listings")) {
    if (folder.id !== null) continue; // a file, not a member's folder
    const prefix = `listings/${folder.name}`;
    for (const file of await listFolder(prefix)) {
      if (file.id === null || !file.created_at) continue;
      images.push({
        path: `${prefix}/${file.name}`,
        createdAt: new Date(file.created_at),
      });
    }
  }
  return images;
}

/** Remove storage objects, throwing on failure (unlike deleteImages). */
export async function removeImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await admin().storage.from(BUCKET).remove(paths);
  if (error) {
    throw new Error(`Failed to remove images: ${error.message}`);
  }
}

/**
 * Upload already-in-hand image bytes (e.g. a fetched game cover) to the bucket
 * server-side, returning the stored object path. Type must be allowed.
 */
export async function uploadImageBytes(
  userId: string,
  bytes: Buffer | Uint8Array,
  contentType: string,
): Promise<string> {
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) {
    throw new Error(`Unsupported image type: ${contentType}`);
  }
  const path = `${userImagePrefix(userId)}${randomUUID()}.${ext}`;
  const { error } = await admin()
    .storage.from(BUCKET)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) {
    throw new Error(`Failed to upload image: ${error.message}`);
  }
  return path;
}
