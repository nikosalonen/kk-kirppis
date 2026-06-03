import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

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
    const path = `listings/${userId}/${randomUUID()}.${ext}`;
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
  await admin().storage.from(BUCKET).remove(paths);
}
