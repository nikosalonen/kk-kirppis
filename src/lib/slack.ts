import "server-only";
import { formatPrice } from "@/lib/format";
import { publicImageUrl } from "@/lib/image-url";

/**
 * Look up a member's Slack @handle via users.info. Needs the bot token with
 * the `users:read` scope. Best-effort: returns null if not configured or on
 * any error, so callers fall back to the display name.
 */
export async function fetchSlackHandle(
  slackUserId: string,
): Promise<string | null> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(
      `https://slack.com/api/users.info?user=${encodeURIComponent(slackUserId)}`,
      { headers: { authorization: `Bearer ${token}` } },
    );
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      user?: { name?: string; profile?: { display_name?: string } };
    };
    if (!data.ok) {
      console.error("[slack handle] users.info failed:", data.error);
      return null;
    }
    const handle = data.user?.profile?.display_name || data.user?.name || "";
    return handle.length > 0 ? handle : null;
  } catch (err) {
    console.error("[slack handle] error:", err);
    return null;
  }
}

type AnnounceInput = {
  id: string;
  title: string;
  priceCents: number;
  platform?: string | null;
  sellerLabel: string;
  coverPath?: string | null;
};

/**
 * Posts a "new listing" card to the configured Slack channel via a bot token.
 * Best-effort: if the feature isn't configured or Slack errors, it logs and
 * returns — it never throws, so it can't break listing creation.
 */
export async function announceNewListing(input: AnnounceInput): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  const channel = process.env.SLACK_ANNOUNCE_CHANNEL_ID;
  if (!token || !channel) return; // feature disabled until configured

  const base = process.env.AUTH_URL ?? "";
  const url = `${base}/listings/${input.id}`;
  const price = formatPrice(input.priceCents);

  // Escape Slack mrkdwn metacharacters in user-supplied text so a crafted
  // title/platform/name can't inject links or formatting into the channel.
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const meta = input.platform ?? "";

  // Title is plain (escaped) text — the clickable link lives only in the
  // button below, whose url is our own constructed value, not user input.
  const section: Record<string, unknown> = {
    type: "section",
    text: {
      type: "mrkdwn",
      text: `*${esc(input.title)}*\n${price}${meta ? ` · ${esc(meta)}` : ""}`,
    },
  };
  if (input.coverPath) {
    section.accessory = {
      type: "image",
      image_url: publicImageUrl(input.coverPath),
      alt_text: input.title,
    };
  }

  const blocks = [
    section,
    {
      type: "context",
      elements: [
        { type: "mrkdwn", text: `Listed by ${esc(input.sellerLabel)}` },
      ],
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View listing" },
          url,
        },
      ],
    },
  ];

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
