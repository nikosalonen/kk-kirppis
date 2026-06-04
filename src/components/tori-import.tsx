"use client";

import { useState } from "react";
import { Link2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToriListing } from "@/lib/tori-import";

export function ToriImport({
  canAddCover,
  onImport,
}: {
  // Whether there's room to import the cover alongside the seller's own photos.
  canAddCover: boolean;
  onImport: (data: {
    title: string;
    description: string;
    priceEuros: string;
    coverPath: string | null;
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    const u = url.trim();
    if (!u) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/import/tori", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      if (!res.ok) throw new Error("import failed");
      const { listing } = (await res.json()) as { listing: ToriListing };

      // Import the cover into our bucket (best-effort, like the metadata finder).
      let coverPath: string | null = null;
      if (canAddCover && listing.coverUrl) {
        try {
          const r = await fetch("/api/metadata/cover", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ coverUrl: listing.coverUrl }),
          });
          if (r.ok) coverPath = ((await r.json()) as { path?: string }).path ?? null;
        } catch {
          coverPath = null;
        }
      }

      onImport({
        title: listing.title ?? "",
        description: listing.description ?? "",
        priceEuros: listing.priceEuros != null ? String(listing.priceEuros) : "",
        coverPath,
      });
      setOpen(false);
      setUrl("");
    } catch {
      setError(
        "Couldn't import that listing. Check the link, or fill the form in manually.",
      );
    } finally {
      setLoading(false);
    }
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
        <Button type="button" size="md" onClick={run} disabled={loading}>
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
      {error ? <p className="text-sm text-muted">{error}</p> : null}
      <p className="text-xs text-muted/80">
        Pulls the title, description, price, and cover photo. Review and edit
        before publishing.
      </p>
    </div>
  );
}
