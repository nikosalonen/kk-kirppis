import "server-only";
import { formatPrice } from "@/lib/format";
import { publicImageUrl } from "@/lib/image-url";

type AnnounceInput = {
  id: string;
  title: string;
  priceCents: number;
  platform?: string | null;
  sellerLabel: string;
  coverPath?: string | null;
};

/**
 * Absolute site base URL (no trailing slash), or null if we can't determine
 * one. Slack Block Kit buttons require an absolute URL, so we never build a
 * button from a relative path — we omit it instead.
 */
function siteBaseUrl(): string | null {
  const explicit = process.env.AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit && /^https?:\/\//.test(explicit)) {
    return explicit.replace(/\/+$/, "");
  }
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return null;
}

/**
 * Posts a "new listing" card to the configured Slack channel via a bot token.
 * Best-effort: if the feature isn't configured or Slack errors, it logs and
 * returns — it never throws, so it can't break listing creation.
 */
export async function announceNewListing(input: AnnounceInput): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_ANNOUNCE_CHANNEL_ID;
  if (!token || !channel) return; // feature disabled until configured

  const base = siteBaseUrl();
  const price = formatPrice(input.priceCents);

  // Escape Slack mrkdwn metacharacters in user-supplied text so a crafted
  // title/platform/name can't inject links or formatting into the channel.
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const meta = input.platform ?? "";

  // Title is plain (escaped) text — the clickable link lives only in the
  // button below, whose url is our own constructed value, not user input.
  const blocks: Record<string, unknown>[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${esc(input.title)}*\n${price}${meta ? ` · ${esc(meta)}` : ""}`,
      },
    },
  ];

  // Full-width preview of the listing's first image, when there is one.
  if (input.coverPath) {
    blocks.push({
      type: "image",
      image_url: publicImageUrl(input.coverPath),
      alt_text: input.title,
    });
  }

  blocks.push({
    type: "context",
    elements: [{ type: "mrkdwn", text: `Listed by ${esc(input.sellerLabel)}` }],
  });

  // Slack rejects a button with a relative URL (and the whole message with it),
  // so only add the "View listing" action when we have an absolute base URL.
  if (base) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View listing" },
          url: `${base}/listings/${input.id}`,
        },
      ],
    });
  }

  try {
    const res = await fetch("https://slack.com/api/chat.postMessage", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json; charset=utf-8",
      },
      body: JSON.stringify({
        channel,
        text: `New listing: ${esc(input.title)} — ${price}`,
        blocks,
        unfurl_links: false,
      }),
    });
    const data = (await res.json()) as { ok: boolean; error?: string };
    if (!data.ok) {
      console.error("[slack announce] postMessage failed:", data.error);
    }
  } catch (err) {
    console.error("[slack announce] error:", err);
  }
}
