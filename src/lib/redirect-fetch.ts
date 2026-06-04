// SSRF-safe fetch: follow redirects MANUALLY, re-validating every hop's URL
// against the caller's host allowlist.
//
// Auto-following (the default `redirect: "follow"`) would let an upstream 3xx —
// an open redirect, an internal host, a cloud-metadata IP — escape the allowlist
// (SSRF), because a one-shot host check only ever covers the FIRST URL. Both the
// tori listing import and the cover import fetch attacker-influenceable URLs, so
// every redirect hop must be re-validated. This is the single choke point for
// that guarantee; route both through it instead of re-implementing the loop.
//
// Returns the final non-redirect Response. Throws if a hop leaves the allowlist
// or the hop budget is exhausted. Deliberately free of `import "server-only"` so
// it stays unit-testable (like lib/tori-import.ts) — only call it from server
// code.
export async function fetchAllowedRedirects(
  startUrl: string,
  isAllowed: (url: string) => boolean,
  init: RequestInit = {},
  maxHops = 4,
): Promise<Response> {
  if (!isAllowed(startUrl)) {
    throw new Error("URL host is not on the allowlist");
  }

  let current = startUrl;
  for (let hop = 0; hop < maxHops; hop++) {
    const res = await fetch(current, { ...init, redirect: "manual" });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      const next = location ? new URL(location, current).toString() : null;
      // Re-validate the hop target before we ever fetch it; a relative or
      // protocol-relative Location is resolved against `current` first.
      if (!next || !isAllowed(next)) {
        throw new Error("redirect left the allowlist");
      }
      current = next;
      continue;
    }

    return res;
  }
  throw new Error("too many redirects");
}
