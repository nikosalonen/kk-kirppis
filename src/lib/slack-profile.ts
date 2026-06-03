import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";

export type SlackProfile = {
  // Real name (or a generic fallback) — used for avatar initials and as the
  // label when no @handle is set.
  name: string;
  // The Slack @display name, when the member has one. null otherwise.
  handle: string | null;
  // Avatar URL from the Slack profile, or null.
  image: string | null;
};

// Shown when the bot token is missing/invalid or Slack is unreachable. The
// page still works — contact + ownership rely on slackId/id, not this.
const FALLBACK: SlackProfile = {
  name: "Koodiklinikka member",
  handle: null,
  image: null,
};

// Throws on any failure so the failure is NOT written to the cache (a transient
// Slack/token error would otherwise stick for the whole revalidate window).
async function fetchSlackProfile(slackId: string): Promise<SlackProfile> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) throw new Error("SLACK_BOT_TOKEN is not set");

  const res = await fetch(
    `https://slack.com/api/users.info?user=${encodeURIComponent(slackId)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  const data = (await res.json()) as {
    ok: boolean;
    error?: string;
    user?: {
      real_name?: string;
      profile?: {
        display_name?: string;
        real_name?: string;
        image_72?: string;
        image_192?: string;
        image_512?: string;
      };
    };
  };
  if (!data.ok) throw new Error(`users.info failed: ${data.error}`);

  const p = data.user?.profile ?? {};
  const handle = (p.display_name ?? "").trim() || null;
  const name =
    (data.user?.real_name ?? p.real_name ?? "").trim() || FALLBACK.name;
  const image = p.image_192 ?? p.image_72 ?? p.image_512 ?? null;
  return { name, handle, image };
}

// Cross-request cache (persists in Vercel's Data Cache). One Slack call per
// member per hour regardless of traffic; revalidateTag("slack-profile") busts.
const cachedFetch = unstable_cache(fetchSlackProfile, ["slack-profile"], {
  revalidate: 3600,
  tags: ["slack-profile"],
});

/**
 * Resolve a member's public Slack identity. Cached across requests (1h) and
 * deduped within a single render via React.cache. Never throws — returns a
 * safe fallback if Slack can't be reached, so callers can render freely.
 */
export const getSlackProfile = cache(
  async (slackId: string): Promise<SlackProfile> => {
    try {
      return await cachedFetch(slackId);
    } catch (err) {
      console.error("[slack-profile] lookup failed:", err);
      return FALLBACK;
    }
  },
);
