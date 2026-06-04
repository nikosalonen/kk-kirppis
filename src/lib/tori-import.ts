// Best-effort import of a tori.fi "for sale" listing so a seller can paste a
// link and prefill the form. We read ONLY the page's schema.org Product JSON-LD
// — a stable, standards-based blob that carries the title, description, price,
// and the cover image. We deliberately do NOT scrape the photo gallery or the
// React Server Component stream; the JSON-LD is the robust surface.
//
// No secrets here (unlike metadata.ts), so this stays importable client-side for
// the pure helpers; only fetchToriListing makes a network call (from the route).

import { fetchAllowedRedirects } from "@/lib/redirect-fetch";

// tori serves listing photos from this CDN host. The cover-import route's
// allowlist (isAllowedCoverHost in lib/metadata.ts) imports this same constant,
// so the two stay coupled by the compiler rather than by a comment.
export const TORI_IMAGE_HOST = "img.tori.net";

export type ToriListing = {
  title: string;
  description: string;
  // Euros as a number (tori prices are EUR). Null when absent/unparseable.
  priceEuros: number | null;
  // Single cover image URL on the tori CDN, or null. JSON-LD only carries one.
  coverUrl: string | null;
};

// Accept only canonical tori.fi item URLs. The host check is the SSRF guard:
// the route fetches whatever URL passes this, so it must stay tori.fi-only.
export function isToriItemUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      u.protocol === "https:" &&
      (u.hostname === "www.tori.fi" || u.hostname === "tori.fi") &&
      /\/item\/\d+\/?$/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

function isToriImage(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === TORI_IMAGE_HOST;
  } catch {
    return false;
  }
}

// schema.org `image` may be a string or an array; keep the first tori-hosted one.
function pickImage(image: unknown): string | null {
  const candidates = Array.isArray(image) ? image : [image];
  for (const c of candidates) {
    if (typeof c === "string" && isToriImage(c)) return c;
  }
  return null;
}

// Parse every <script type="application/ld+json"> block; tolerate invalid ones.
function* jsonLdBlocks(html: string): Generator<unknown> {
  const re =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      yield JSON.parse(m[1]);
    } catch {
      // ignore malformed blocks
    }
  }
}

// Find a Product node within a parsed JSON-LD value (object, array, or @graph).
function findProduct(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findProduct(item);
      if (found) return found;
    }
    return null;
  }
  if (node && typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (obj["@type"] === "Product") return obj;
    if (Array.isArray(obj["@graph"])) return findProduct(obj["@graph"]);
  }
  return null;
}

// Map a tori item page's HTML to our listing shape via its Product JSON-LD.
// Returns null if no usable Product block is present.
export function parseToriListing(html: string): ToriListing | null {
  for (const block of jsonLdBlocks(html)) {
    const product = findProduct(block);
    if (!product) continue;

    const title = typeof product.name === "string" ? product.name.trim() : "";
    if (!title) continue;

    const description =
      typeof product.description === "string"
        ? product.description.trim()
        : "";

    const offers =
      product.offers && typeof product.offers === "object"
        ? (product.offers as Record<string, unknown>)
        : null;
    const rawPrice = offers?.price;
    const priceNum =
      typeof rawPrice === "string"
        ? Number(rawPrice)
        : typeof rawPrice === "number"
          ? rawPrice
          : NaN;
    const priceEuros =
      Number.isFinite(priceNum) && priceNum >= 0 ? priceNum : null;

    return {
      title,
      description,
      priceEuros,
      coverUrl: pickImage(product.image),
    };
  }
  return null;
}

// Fetch a tori item page and parse its listing. Throws on a non-tori URL, an
// upstream failure, or a page with no Product JSON-LD. Network-only — call from
// the server route, never the client.
export async function fetchToriListing(url: string): Promise<ToriListing> {
  if (!isToriItemUrl(url)) {
    throw new Error("Not a tori.fi item URL");
  }

  // Follow redirects through the shared SSRF-safe helper, re-validating every
  // hop with isToriItemUrl so a tori 3xx can't escape the host allowlist.
  const res = await fetchAllowedRedirects(url, isToriItemUrl, {
    headers: {
      // tori serves the listing HTML to normal browsers; identify as one.
      "user-agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      accept: "text/html",
      "accept-language": "fi,en;q=0.8",
    },
    signal: AbortSignal.timeout(10_000),
  });

  if (!res.ok) {
    throw new Error(`tori fetch failed: ${res.status}`);
  }
  const listing = parseToriListing(await res.text());
  if (!listing) {
    throw new Error("No listing data found on the page");
  }
  return listing;
}
