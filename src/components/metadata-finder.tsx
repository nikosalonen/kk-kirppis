"use client";

import { useState } from "react";
import { Images, Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = { title: string; year: string | null; imageUrls: string[] };

export function MetadataFinder({
  defaultQuery = "",
  remainingSlots,
  onPick,
}: {
  defaultQuery?: string;
  // How many more images the form can still accept.
  remainingSlots: number;
  onPick: (picked: { title: string; coverPaths: string[] }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(defaultQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [searching, setSearching] = useState(false);
  const [importingIdx, setImportingIdx] = useState<number | null>(null);
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

  async function pick(result: Result, idx: number) {
    setImportingIdx(idx);
    setError(null);
    // Import only as many as the form can still hold; cover comes first.
    const toImport = result.imageUrls.slice(0, Math.max(0, remainingSlots));
    let coverPaths: string[] = [];
    try {
      const imported = await Promise.all(
        toImport.map(async (coverUrl) => {
          try {
            const res = await fetch("/api/metadata/cover", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ coverUrl }),
            });
            if (!res.ok) return null;
            return ((await res.json()) as { path?: string }).path ?? null;
          } catch {
            return null;
          }
        }),
      );
      coverPaths = imported.filter((p): p is string => p !== null);
    } finally {
      setImportingIdx(null);
    }
    // Non-fatal: still fill the title even if every image import failed.
    onPick({ title: result.title, coverPaths });
    setOpen(false);
    setResults([]);
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
          {results.map((r, idx) => (
            <li key={`${r.title}-${idx}`}>
              <button
                type="button"
                onClick={() => pick(r, idx)}
                disabled={importingIdx !== null}
                className="flex w-full items-center gap-3 rounded-lg border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-surface-2 disabled:opacity-50"
              >
                <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">
                  {r.imageUrls[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={r.imageUrls[0]}
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
                    {r.imageUrls.length > 1 ? (
                      <span className="inline-flex items-center gap-1">
                        <Images className="h-3 w-3" />
                        {r.imageUrls.length}
                      </span>
                    ) : null}
                  </span>
                </span>
                {importingIdx === idx ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-accent" />
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
