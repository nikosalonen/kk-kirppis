"use client";

import { Analytics as VercelAnalytics } from "@vercel/analytics/next";

// Vercel Web Analytics is cookieless and collects no PII by default. We tighten
// it further: drop query strings (could carry search terms) and redact cuid-like
// id segments so individual listing/seller views are recorded only by route
// shape (e.g. /listings/[id]), never the specific item.
export function Analytics() {
  return (
    <VercelAnalytics
      beforeSend={(event) => {
        try {
          const url = new URL(event.url);
          url.search = "";
          url.pathname = url.pathname
            .split("/")
            .map((seg) => (/^c[a-z0-9]{20,}$/i.test(seg) ? "[id]" : seg))
            .join("/");
          return { ...event, url: url.toString() };
        } catch {
          return event;
        }
      }}
    />
  );
}
