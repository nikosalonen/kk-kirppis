import { describe, it, expect } from "vitest";
import { formatListedAgo, formatPrice } from "@/lib/format";

// fi-FI separates the amount and the € sign with a no-break space.
const nbsp = (s: string) => s.replace(/ /g, " ");

describe("formatPrice", () => {
  it("drops the decimals for whole euros, like a price sticker", () => {
    expect(formatPrice(2500)).toBe(nbsp("25 €"));
    expect(formatPrice(0)).toBe(nbsp("0 €"));
  });

  it("keeps two decimals when there are cents", () => {
    expect(formatPrice(2450)).toBe(nbsp("24,50 €"));
    expect(formatPrice(5)).toBe(nbsp("0,05 €"));
  });
});

describe("formatListedAgo", () => {
  const now = new Date("2026-10-06T12:00:00Z");
  const hoursAgo = (h: number) => new Date(now.getTime() - h * 3_600_000);

  it("says today within the first 24 hours", () => {
    expect(formatListedAgo(hoursAgo(0), now)).toBe("today");
    expect(formatListedAgo(hoursAgo(23), now)).toBe("today");
  });

  it("says yesterday, then counts days", () => {
    expect(formatListedAgo(hoursAgo(24), now)).toBe("yesterday");
    expect(formatListedAgo(hoursAgo(24 * 5), now)).toBe("5 days ago");
  });

  it("switches to months after 30 days", () => {
    expect(formatListedAgo(hoursAgo(24 * 29), now)).toBe("29 days ago");
    expect(formatListedAgo(hoursAgo(24 * 30), now)).toBe("last month");
    expect(formatListedAgo(hoursAgo(24 * 45), now)).toBe("last month");
    expect(formatListedAgo(hoursAgo(24 * 100), now)).toBe("3 months ago");
  });

  it("treats a future date (clock skew) as today", () => {
    expect(formatListedAgo(hoursAgo(-2), now)).toBe("today");
  });
});
