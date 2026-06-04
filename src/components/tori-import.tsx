"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToriListing } from "@/lib/tori-import";

// The prefill the importer hands to the form. Distinct from ToriListing
// (priceEuros is a form-ready string here; coverPath is our stored path, not the
// source URL). Shared with listing-form's onToriImport so the two can't drift.
export type ToriImportPayload = {
  title: string;
  description: string;
  priceEuros: string;
  coverPath: string | null;
};

export function ToriImport({
  canAddCover,
  onImport,
}: {
  // Whether there's room to import the cover alongside the seller's own photos.
  canAddCover: boolean;
  onImport: (data: ToriImportPayload) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const u = url.trim();
    if (!u || !agreed) return;
    setLoading(true);
    setError(null);

    let payload: ToriImportPayload | null = null;
    try {
      const res = await fetch("/api/import/tori", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      if (!res.ok) {
        // Surface the server's specific, user-actionable message (bad link,
        // session expired, timeout, no data) instead of one generic string.
        const data = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        console.error("[tori-import] import failed:", res.status, data?.error);
        setError(
          data?.error ??
            "Couldn't import that listing. Check the link, or fill the form in manually.",
        );
        return;
      }
      const { listing } = (await res.json()) as { listing: ToriListing };

      // Import the cover into our bucket (best-effort, like the metadata finder):
      // a failure here only drops the cover, the rest of the prefill proceeds —
      // but log it so a silently coverless import is still diagnosable.
      let coverPath: string | null = null;
      if (canAddCover && listing.coverUrl) {
        try {
          const r = await fetch("/api/metadata/cover", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ coverUrl: listing.coverUrl }),
          });
          if (r.ok) {
            coverPath = ((await r.json()) as { path?: string }).path ?? null;
          } else {
            console.error("[tori-import] cover import failed:", r.status);
          }
        } catch (e) {
          console.error("[tori-import] cover import error:", e);
        }
      }

      payload = {
        title: listing.title,
        description: listing.description,
        priceEuros:
          listing.priceEuros != null ? String(listing.priceEuros) : "",
        coverPath,
      };
    } catch (e) {
      console.error("[tori-import] failed:", e);
      setError(
        "Couldn't import that listing. Check the link, or fill the form in manually.",
      );
      return;
    } finally {
      setLoading(false);
    }

    // Hand off outside the try so an error thrown by the parent's onImport isn't
    // misreported to the user as an import failure. (Unreachable when null — the
    // failure paths above already returned — but narrows the type.)
    if (!payload) return;
    onImport(payload);
    setOpen(false);
    setUrl("");
    setAgreed(false);
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => setOpen(true)}
      >
        <Link2 className="h-4 w-4 text-accent" />
        Import from Tori
      </Button>
    );
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-[var(--radius)] border border-accent/30 bg-surface/60 p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Link2 className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void run();
              }
            }}
            placeholder="Paste a tori.fi listing link…"
            className="pl-9"
            inputMode="url"
            autoFocus
          />
        </div>
        <Button
          type="button"
          size="md"
          onClick={run}
          disabled={loading || !agreed}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Import"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="md"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
      <label className="flex w-fit items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="h-4 w-4 accent-accent"
        />
        I swear this is my tori.fi listing
      </label>
      {error ? <p className="text-sm text-muted">{error}</p> : null}
      <p className="text-xs text-muted/80">
        Pulls the title, description, price, and cover photo. Review and edit
        before publishing.
      </p>
    </div>
  );
}
