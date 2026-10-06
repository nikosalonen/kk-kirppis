const priceFormatter = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

const wholeEuroFormatter = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
  maximumFractionDigits: 0,
});

/** "25 €" for whole euros, "24,50 €" when there are cents. */
export function formatPrice(cents: number): string {
  const formatter = cents % 100 === 0 ? wholeEuroFormatter : priceFormatter;
  return formatter.format(cents / 100);
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const DAY_MS = 24 * 60 * 60 * 1000;

/** How long ago a listing went up: "today", "5 days ago", "last month". */
export function formatListedAgo(date: Date, now: Date = new Date()): string {
  const days = Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
  if (days < 30) return relativeTime.format(-days, "day");
  return relativeTime.format(-Math.floor(days / 30), "month");
}

/** Public-facing seller label: the Slack @handle when known, else the name. */
export function sellerLabel(seller: {
  name: string;
  handle?: string | null;
}): string {
  return seller.handle ? `@${seller.handle}` : seller.name;
}

/**
 * Deep link that opens a Slack DM with the seller inside the workspace.
 * Requires the workspace team id (constant) and the seller's Slack user id.
 */
export function slackDmUrl(teamId: string, slackUserId: string): string {
  return `https://slack.com/app_redirect?team=${encodeURIComponent(
    teamId,
  )}&channel=${encodeURIComponent(slackUserId)}`;
}
