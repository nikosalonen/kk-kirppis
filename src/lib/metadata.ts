import "server-only";

export type GamePlatform = {
  name: string;
  abbreviation: string | null;
  slug: string | null;
};

export type GameResult = {
  title: string;
  year: string | null;
  // Allowed-host cover URL, or null if the game has no cover.
  coverUrl: string | null;
  // Platforms the game released on, for the seller to pick from.
  platforms: GamePlatform[];
};

// IGDB serves every cover/screenshot image from this host (used to build cover
// URLs below).
const IGDB_IMAGE_HOST = "images.igdb.com";

// Image CDNs the cover-import route is allowed to fetch from (SSRF guard — it
// never fetches arbitrary input): IGDB covers/screenshots and tori.fi listing
// photos (for the tori import).
const ALLOWED_IMAGE_HOSTS = new Set([IGDB_IMAGE_HOST, "img.tori.net"]);

export function isAllowedCoverHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && ALLOWED_IMAGE_HOSTS.has(u.hostname);
  } catch {
    return false;
  }
}

// Build a full image URL from an IGDB image_id + size token.
// Sizes: https://api-docs.igdb.com/#images
function igdbImageUrl(imageId: string, size: string): string {
  return `https://${IGDB_IMAGE_HOST}/igdb/image/upload/t_${size}/${imageId}.jpg`;
}

function imageId(node: unknown): string | null {
  if (node && typeof node === "object") {
    const id = (node as { image_id?: unknown }).image_id;
    if (typeof id === "string" && id.length > 0) return id;
  }
  return null;
}

// IGDB auth piggybacks on Twitch OAuth (client-credentials). Tokens live ~60
// days, so we cache one in-module and only refetch as it nears expiry. A warm
// serverless instance reuses it; a cold start just fetches a fresh one.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getIgdbToken(): Promise<string> {
  const clientId = process.env.IGDB_CLIENT_ID;
  const clientSecret = process.env.IGDB_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("IGDB_CLIENT_ID / IGDB_SECRET are not set");
  }

  // Reuse a still-valid token (60s safety margin before expiry).
  if (cachedToken && cachedToken.expiresAt - 60_000 > Date.now()) {
    return cachedToken.value;
  }

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const res = await fetch(url, { method: "POST" });
  if (!res.ok) {
    throw new Error(`IGDB token request failed: ${res.status}`);
  }
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
  };
  if (!data.access_token) {
    throw new Error("IGDB token response missing access_token");
  }
  cachedToken = {
    value: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  return cachedToken.value;
}

export async function searchGames(query: string): Promise<GameResult[]> {
  const clientId = process.env.IGDB_CLIENT_ID;
  if (!clientId) {
    throw new Error("IGDB_CLIENT_ID is not set");
  }
  const token = await getIgdbToken();

  // Apicalypse query: fuzzy search by name, pulling the cover image id, the
  // release date, and the platforms (nested expansion — no extra API call).
  // Escape quotes so the search term can't break out of the query string.
  const body = [
    `search "${query.replace(/"/g, '\\"')}";`,
    "fields name, first_release_date, cover.image_id, platforms.name, platforms.abbreviation, platforms.slug;",
    "limit 8;",
  ].join(" ");

  const res = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      authorization: `Bearer ${token}`,
      accept: "application/json",
    },
    body,
  });
  if (!res.ok) {
    throw new Error(`IGDB search failed: ${res.status}`);
  }

  const data: unknown = await res.json();
  const results = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : [];

  return results
    .map((r) => {
      const coverId = imageId(r.cover);
      const cover = coverId ? igdbImageUrl(coverId, "cover_big_2x") : "";
      // Keep the cover only if it's an allowed-host URL (SSRF guard mirrors the
      // import route); otherwise drop it.
      const coverUrl = cover && isAllowedCoverHost(cover) ? cover : null;
      // Platforms come back via nested expansion; keep the named ones.
      const platforms: GamePlatform[] = Array.isArray(r.platforms)
        ? (r.platforms as Record<string, unknown>[])
            .map((p) => ({
              name: typeof p.name === "string" ? p.name : "",
              abbreviation:
                typeof p.abbreviation === "string" ? p.abbreviation : null,
              slug: typeof p.slug === "string" ? p.slug : null,
            }))
            .filter((p) => p.name.length > 0)
        : [];
      // first_release_date is a Unix timestamp (seconds).
      const ts =
        typeof r.first_release_date === "number" ? r.first_release_date : null;
      const year = ts
        ? new Date(ts * 1000).getUTCFullYear().toString()
        : null;
      return {
        title: typeof r.name === "string" ? r.name : "",
        year,
        coverUrl,
        platforms,
      };
    })
    .filter((g) => g.title.length > 0);
}
