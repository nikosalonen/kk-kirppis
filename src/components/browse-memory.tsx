"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

// Remembers the last home-page URL (search + platform filter) for this tab, so
// "Back to listings" on a detail page returns to the same results.
const STORAGE_KEY = "kk-kirppis:last-browse-url";

// Only home-page URLs are stored and followed.
function isHomeUrl(value: string | null): value is string {
  return value === "/" || Boolean(value?.startsWith("/?"));
}

export function RememberBrowseUrl({ href }: { href: string }) {
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, href);
    } catch {
      // Storage can be blocked (private mode); the back link then goes to "/".
    }
  }, [href]);
  return null;
}

function readBrowseUrl(): string {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    return isHomeUrl(stored) ? stored : "/";
  } catch {
    return "/";
  }
}

// The stored value only changes on another page, so there's nothing to
// subscribe to; the snapshot is read once per render.
const subscribe = () => () => {};

export function BackToListings() {
  const href = useSyncExternalStore(subscribe, readBrowseUrl, () => "/");

  return (
    <Link
      href={href}
      className="inline-flex w-fit items-center gap-1.5 text-sm text-muted hover:text-ink"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to listings
    </Link>
  );
}
