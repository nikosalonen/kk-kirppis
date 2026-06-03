const priceFormatter = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
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
