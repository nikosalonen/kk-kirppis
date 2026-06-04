"use client";

import { useState } from "react";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { GamePlatform } from "@/lib/metadata";

type Result = {
  title: string;
  year: string | null;
  coverUrl: string | null;
  platforms: GamePlatform[];
};

export function MetadataFinder({
  defaultQuery = "",
  canAddCover,
  onPick,
}: {
  defaultQuery?: string;
  // Whether there's room to import a cover alongside the seller's own photos.
  canAddCover: boolean;
  onPick: (picked: {
    title: string;
    coverPath: string | null;
    platforms: GamePlatform[];
  }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runSearch() {
    const q = query.trim();
    if (!q) return;
    setSearching(true);
    setError(null);
    setResults([]);
    try {
      const res = await fetch("/api/metadata/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ q }),
      });
      if (!res.ok) throw new Error("search failed");
      const data = (await res.json()) as { results?: Result[] };
      setResults(data.results ?? []);
      if (!data.results?.length) setError("No games found — try another title.");
    } catch {
      setError("Search failed. Try again.");
    } finally {
      setSearching(false);
    }
  }

  // Import the game's cover into our bucket (if there's room), then hand the
  // title + platforms + resulting path back to the form. Non-fatal: a failed
  // cover import just drops out, and the title/platforms still apply.
  async function chooseResult(result: Result) {
    setImporting(true);
    setError(null);
    let coverPath: string | null = null;
    try {
      if (canAddCover && result.coverUrl) {
        const res = await fetch("/api/metadata/cover", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ coverUrl: result.coverUrl }),
        });
        if (res.ok) {
          coverPath = ((await res.json()) as { path?: string }).path ?? null;
        }
      }
    } catch {
      coverPath = null;
    } finally {
      setImporting(false);
    }

    onPick({ title: result.title, coverPath, platforms: result.platforms });

    // Surface a cover-import failure instead of silently dropping it; otherwise
    // close the finder.
    if (canAddCover && result.coverUrl && !coverPath) {
      setError(
        "Couldn't import the cover — title and platform were still applied.",
      );
    } else {
      setOpen(false);
      setResults([]);
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
        <Sparkles className="h-4 w-4 text-accent" />
        Find game info
      </Button>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-accent/30 bg-surface/60 p-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch();
              }
            }}
            placeholder="Search for a game…"
            className="pl-9"
            autoFocus
          />
        </div>
        <Button type="button" size="md" onClick={runSearch} disabled={searching}>
          {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
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

      {results.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {results.map((r, idx) => {
            const platformLabels = r.platforms
              .map((p) => p.abbreviation ?? p.name)
              .join(" · ");
            return (
              <li key={`${r.title}-${idx}`}>
                <button
                  type="button"
                  onClick={() => void chooseResult(r)}
                  disabled={importing}
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-surface-2 disabled:opacity-50"
                >
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
                    {r.coverUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.coverUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-ink">
                      {r.title}
                    </span>
                    <span className="flex items-center gap-2 font-mono text-xs text-muted">
                      {r.year ? <span>{r.year}</span> : null}
                      {platformLabels ? (
                        <span className="truncate">{platformLabels}</span>
                      ) : null}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
