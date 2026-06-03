import type { Condition } from "@prisma/client";

const priceFormatter = new Intl.NumberFormat("fi-FI", {
  style: "currency",
  currency: "EUR",
});

export function formatPrice(cents: number): string {
  return priceFormatter.format(cents / 100);
}

export const CONDITION_LABELS: Record<Condition, string> = {
  NEW: "New",
  LIKE_NEW: "Like new",
  GOOD: "Good",
  ACCEPTABLE: "Acceptable",
};

/**
 * Deep link that opens a Slack DM with the seller inside the workspace.
 * Requires the workspace team id (constant) and the seller's Slack user id.
 */
export function slackDmUrl(teamId: string, slackUserId: string): string {
  return `https://slack.com/app_redirect?team=${encodeURIComponent(
    teamId,
  )}&channel=${encodeURIComponent(slackUserId)}`;
}
