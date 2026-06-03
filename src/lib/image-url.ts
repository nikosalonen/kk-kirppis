// Pure helper (no server-only deps) so both server and client can build the
// public read URL for a stored image. The bucket is public-read.
const BUCKET = process.env.SUPABASE_STORAGE_BUCKET ?? "listing-images";

export function publicImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${path}`;
}
