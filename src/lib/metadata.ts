import "server-only";

export type GameResult = {
  title: string;
  year: string | null;
  // Allowed-host image URLs, cover first, deduped. May be empty.
  imageUrls: string[];
};

// RAWG serves cover/background images from this host. The cover-import route
// only fetches URLs on this host (SSRF guard) — never arbitrary user input.
const RAWG_IMAGE_HOST = "media.rawg.io";

export function isAllowedCoverHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === RAWG_IMAGE_HOST;
  } catch {
    return false;
  }
}

export async function searchGames(query: string): Promise<GameResult[]> {
  const key = process.env.RAWG_API_KEY;
  if (!key) {
    throw new Error("RAWG_API_KEY is not set");
  }

  const url = new URL("https://api.rawg.io/api/games");
  url.searchParams.set("key", key);
  url.searchParams.set("search", query);
  url.searchParams.set("page_size", "8");

  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    throw new Error(`RAWG search failed: ${res.status}`);
  }

  const data: unknown = await res.json();
  const results =
    data && typeof data === "object" && Array.isArray((data as { results?: unknown }).results)
      ? ((data as { results: Record<string, unknown>[] }).results)
      : [];

  return results
    .map((r) => {
      const released = typeof r.released === "string" ? r.released : "";
      const cover = typeof r.background_image === "string" ? r.background_image : "";
      // RAWG returns a few preview shots per game alongside the cover.
      const shots = Array.isArray(r.short_screenshots)
        ? (r.short_screenshots as unknown[]).map((s) =>
            s && typeof s === "object" && typeof (s as { image?: unknown }).image === "string"
              ? (s as { image: string }).image
              : "",
          )
        : [];
      // Cover first, then screenshots; dedupe and keep only allowed-host URLs.
      const imageUrls = Array.from(new Set([cover, ...shots])).filter(
        (u) => u.length > 0 && isAllowedCoverHost(u),
      );
      return {
        title: typeof r.name === "string" ? r.name : "",
        year: released.length >= 4 ? released.slice(0, 4) : null,
        imageUrls,
      };
    })
    .filter((g) => g.title.length > 0);
}
