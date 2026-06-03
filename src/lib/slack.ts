import "server-only";
import { formatPrice } from "@/lib/format";
import { publicImageUrl } from "@/lib/image-url";

type AnnounceInput = {
  id: string;
  title: string;
  description: string;
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

  // Title goes in a header block: plain_text, so no mrkdwn injection possible.
  // Slack caps header text at 150 chars.
  const headerText = (input.title || "New listing").slice(0, 150);

  // Price · platform, then the description. Keep the description short enough
  // for a channel card (and well under Slack's 3000-char section text limit).
  const priceLine = `*${price}*${input.platform ? `  ·  ${esc(input.platform)}` : ""}`;
  const trimmed = input.description.trim();
  const desc = trimmed.length > 600 ? `${trimmed.slice(0, 600)}…` : trimmed;
  const sectionText = desc ? `${priceLine}\n\n${esc(desc)}` : priceLine;

  // Small image as the section accessory — Slack renders it as a thumbnail to
  // the right of the details (Block Kit has no left-image layout).
  const section: Record<string, unknown> = {
    type: "section",
    text: { type: "mrkdwn", text: sectionText },
  };
  if (input.coverPath) {
    section.accessory = {
      type: "image",
      image_url: publicImageUrl(input.coverPath),
      alt_text: headerText,
    };
  }

  const blocks: Record<string, unknown>[] = [
    { type: "header", text: { type: "plain_text", text: headerText, emoji: true } },
    section,
  ];

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
          text: { type: "plain_text", text: "View listing →", emoji: true },
          url: `${base}/listings/${input.id}`,
          style: "primary",
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
