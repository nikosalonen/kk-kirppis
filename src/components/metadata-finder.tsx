"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Images, Loader2, Search, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Result = { title: string; year: string | null; imageUrls: string[] };

// A result the user clicked, plus which of its images are currently selected.
type Picker = { result: Result; selected: Set<number> };

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
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // When set, the image-selection modal is open for this result.
  const [picker, setPicker] = useState<Picker | null>(null);

  // Lock body scroll and wire up Escape while the picker modal is open.
  useEffect(() => {
    if (!picker) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !importing) setPicker(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [picker, importing]);

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

  // Import the given image URLs into our bucket (cover first), then hand the
  // title + resulting paths back to the form. Non-fatal: a failed image just
  // drops out, and the title is filled even if every import fails.
  async function importAndFinish(result: Result, urls: string[]) {
    setImporting(true);
    setError(null);
    let coverPaths: string[] = [];
    try {
      const imported = await Promise.all(
        urls.map(async (coverUrl) => {
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
      setImporting(false);
    }
    onPick({ title: result.title, coverPaths });
    setPicker(null);

    // Surface partial failures instead of silently dropping images: keep the
    // finder open with a message so the user knows some shots didn't import.
    const failed = urls.length - coverPaths.length;
    if (failed > 0) {
      setError(
        `${failed} image${failed === 1 ? "" : "s"} couldn't be imported — try again.`,
      );
    } else {
      setOpen(false);
      setResults([]);
    }
  }

  function chooseResult(result: Result) {
    // No room left, or no images: just fill the title.
    if (remainingSlots <= 0 || result.imageUrls.length === 0) {
      void importAndFinish(result, []);
      return;
    }
    // A single image needs no choosing — import it straight away.
    if (result.imageUrls.length === 1) {
      void importAndFinish(result, result.imageUrls);
      return;
    }
    // Otherwise let the user choose. Pre-select the first image (box art).
    setPicker({ result, selected: new Set([0]) });
  }

  function toggle(idx: number) {
    setPicker((prev) => {
      if (!prev) return prev;
      const selected = new Set(prev.selected);
      if (selected.has(idx)) {
        selected.delete(idx);
      } else if (selected.size < remainingSlots) {
        selected.add(idx);
      }
      return { ...prev, selected };
    });
  }

  function confirmPicker() {
    if (!picker) return;
    // Preserve image order (cover first), import only the selected ones.
    const urls = picker.result.imageUrls.filter((_, i) => picker.selected.has(i));
    if (urls.length === 0) return;
    void importAndFinish(picker.result, urls);
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
                onClick={() => chooseResult(r)}
                disabled={importing || picker !== null}
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
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {picker ? (
        <ImagePicker
          picker={picker}
          remainingSlots={remainingSlots}
          importing={importing}
          onToggle={toggle}
          onConfirm={confirmPicker}
          onClose={() => {
            if (!importing) setPicker(null);
          }}
        />
      ) : null}
    </div>
  );
}

function ImagePicker({
  picker,
  remainingSlots,
  importing,
  onToggle,
  onConfirm,
  onClose,
}: {
  picker: Picker;
  remainingSlots: number;
  importing: boolean;
  onToggle: (idx: number) => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { result, selected } = picker;
  const atCap = selected.size >= remainingSlots;
  const count = selected.size;
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  // Move focus into the dialog on open and return it to the trigger on close.
  // The picker mounts/unmounts with the modal, so a mount effect is enough.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-bg/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={`Choose images for ${result.title}`}
      onClick={onClose}
    >
      <div
        // transform-gpu puts the (opaque) modal panel on its own compositing
        // layer, so the thumbnails' hover-transition repaints stay contained
        // here and don't force the overlay's backdrop-blur to re-rasterize.
        className="flex max-h-[85vh] w-full max-w-2xl transform-gpu flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-3 border-b border-border p-4">
          <div className="min-w-0">
            <h2 className="truncate font-display text-lg font-bold">
              Choose images
            </h2>
            <p className="truncate font-mono text-xs text-muted">
              {result.title} · {result.imageUrls.length} available
            </p>
          </div>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            disabled={importing}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-ink disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid grid-cols-3 gap-3 overflow-y-auto p-4 sm:grid-cols-4">
          {result.imageUrls.map((url, i) => {
            const isSelected = selected.has(i);
            const disabled = importing || (!isSelected && atCap);
            return (
              <button
                key={url}
                type="button"
                onClick={() => onToggle(i)}
                disabled={disabled}
                aria-pressed={isSelected}
                className={`group relative aspect-square overflow-hidden rounded-lg border bg-surface-2 transition-all ${
                  isSelected
                    ? "border-accent ring-2 ring-accent"
                    : "border-border hover:border-accent/60"
                } ${disabled && !isSelected ? "cursor-not-allowed opacity-40" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {i === 0 ? (
                  <span className="absolute left-1 top-1 rounded bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                    Box art
                  </span>
                ) : null}
                {isSelected ? (
                  <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-accent text-bg">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-border p-4">
          <span className="font-mono text-xs text-muted">
            {count}/{remainingSlots} selected
            {atCap ? " · max reached" : ""}
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={onClose}
              disabled={importing}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="md"
              onClick={onConfirm}
              disabled={importing || count === 0}
            >
              {importing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                `Use ${count} image${count === 1 ? "" : "s"}`
              )}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
