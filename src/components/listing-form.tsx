"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { GripVertical, ImagePlus, Loader2, X } from "lucide-react";
import type { FormState } from "@/app/(app)/listings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { MetadataFinder } from "@/components/metadata-finder";
import { ToriImport } from "@/components/tori-import";
import type { GamePlatform } from "@/lib/metadata";
import { MAX_IMAGES } from "@/lib/validation";
import { publicImageUrl } from "@/lib/image-url";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

type Defaults = {
  title?: string;
  description?: string;
  priceEuros?: string;
  platform?: string;
};

type UploadTarget = { path: string; signedUrl: string };

// One image in the photo grid, in display order. Either a cover already imported
// to storage (metadata finder) or a local file awaiting upload. A single ordered
// list lets the seller drag-reorder across both kinds; index 0 is the cover.
type Slot =
  | { kind: "imported"; id: string; path: string }
  | { kind: "file"; id: string; file: File; previewUrl: string };

async function uploadImages(files: File[]): Promise<string[]> {
  if (files.length === 0) return [];
  const res = await fetch("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ contentTypes: files.map((f) => f.type) }),
  });
  if (!res.ok) throw new Error("Could not start the image upload.");
  const { targets } = (await res.json()) as { targets: UploadTarget[] };

  await Promise.all(
    targets.map(async (target, i) => {
      const put = await fetch(target.signedUrl, {
        method: "PUT",
        body: files[i],
        headers: { "content-type": files[i].type, "x-upsert": "true" },
      });
      if (!put.ok) throw new Error("An image failed to upload.");
    }),
  );
  return targets.map((t) => t.path);
}

export function ListingForm({
  action,
  defaults,
  allowImages = false,
  showGameFinder = false,
  showToriImport = false,
  initialImages,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Defaults;
  allowImages?: boolean;
  // Show the IGDB "Find game info" helper (creation only — re-picking replaces
  // the cover and would drop existing images, so it's off when editing).
  showGameFinder?: boolean;
  // Show the "Import from Tori" paste-link helper (creation only).
  showToriImport?: boolean;
  // Existing stored image paths (in order) to seed the grid when editing.
  initialImages?: { url: string }[];
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState(defaults?.title ?? "");
  // Controlled so the metadata / Tori importers can prefill them.
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [priceEuros, setPriceEuros] = useState(defaults?.priceEuros ?? "");
  // Ordered photo grid: imported cover(s) + local files, drag-reorderable.
  // Seeded from the listing's existing images when editing.
  const [slots, setSlots] = useState<Slot[]>(() =>
    (initialImages ?? []).map((img) => ({
      kind: "imported",
      id: img.url,
      path: img.url,
    })),
  );
  // Index of the slot currently being dragged, for reorder + visual cue.
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Platform field is controlled so the metadata finder's chips can set it.
  const [platform, setPlatform] = useState(defaults?.platform ?? "");
  // Platforms of the most recently picked game — drives the chip selector.
  const [gamePlatforms, setGamePlatforms] = useState<GamePlatform[]>([]);
  // True once the seller chooses "Other", revealing the free-text input.
  const [platformOther, setPlatformOther] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);
  // Guards the upload window before the server action starts. `isPending` only
  // covers the action transition, leaving the upload window unguarded — a second
  // click there would re-upload and create a duplicate listing. Once uploads
  // finish, `isPending` takes over re-entry protection (see disabled= below).
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const fileCount = slots.filter((s) => s.kind === "file").length;

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    setClientError(null);
    const next = [...slots];
    for (const file of Array.from(selected)) {
      if (next.length >= MAX_IMAGES) {
        setClientError(`You can add up to ${MAX_IMAGES} images.`);
        break;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        setClientError("Only JPEG, PNG, WebP or AVIF images are allowed.");
        continue;
      }
      if (file.size > MAX_BYTES) {
        setClientError("Each image must be 5 MB or smaller.");
        continue;
      }
      next.push({
        kind: "file",
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      });
    }
    setSlots(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeAt(index: number) {
    const slot = slots[index];
    if (slot?.kind === "file") URL.revokeObjectURL(slot.previewUrl);
    setSlots(slots.filter((_, i) => i !== index));
  }

  // Reorder by moving the dragged slot to the drop target's position.
  function moveSlot(from: number, to: number) {
    if (from === to) return;
    setSlots((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }

  function onPickMetadata({
    title: pickedTitle,
    coverPath,
    platforms,
  }: {
    title: string;
    coverPath: string | null;
    platforms: GamePlatform[];
  }) {
    setTitle(pickedTitle.slice(0, 120));
    // A pick represents one game, so its cover *replaces* any previously
    // imported cover and leads the grid. The seller's own files are untouched;
    // cap against them since the old import is being discarded.
    setSlots((prev) => {
      const fileSlots = prev.filter((s) => s.kind === "file");
      const cover: Slot[] =
        coverPath && fileSlots.length < MAX_IMAGES
          ? [{ kind: "imported", id: coverPath, path: coverPath }]
          : [];
      return [...cover, ...fileSlots];
    });
    // Offer the game's platforms as chips. Auto-select when there's only one;
    // otherwise clear the selection so the seller picks the right one.
    setGamePlatforms(platforms);
    setPlatformOther(false);
    setPlatform(
      platforms.length === 1
        ? (platforms[0].abbreviation ?? platforms[0].name)
        : "",
    );
  }

  function onToriImport({
    title: t,
    description: d,
    priceEuros: p,
    coverPath,
  }: {
    title: string;
    description: string;
    priceEuros: string;
    coverPath: string | null;
  }) {
    if (t) setTitle(t.slice(0, 120));
    if (d) setDescription(d.slice(0, 4000));
    if (p) setPriceEuros(p);
    // The imported cover leads the grid (replacing any prior import); the
    // seller's own files are kept.
    setSlots((prev) => {
      const fileSlots = prev.filter((s) => s.kind === "file");
      const cover: Slot[] =
        coverPath && fileSlots.length < MAX_IMAGES
          ? [{ kind: "imported", id: coverPath, path: coverPath }]
          : [];
      return [...cover, ...fileSlots];
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return; // ignore re-entry while a submit is in flight
    setSubmitting(true);
    setClientError(null);
    const formData = new FormData(e.currentTarget);
    try {
      // Upload the local files (in grid order), then emit every path in slot
      // order so sortOrder — and the cover (index 0) — follows the arrangement.
      const fileSlots = slots.filter(
        (s): s is Extract<Slot, { kind: "file" }> => s.kind === "file",
      );
      const uploaded = await uploadImages(fileSlots.map((s) => s.file));
      const uploadedById = new Map(
        fileSlots.map((s, i) => [s.id, uploaded[i]]),
      );
      for (const slot of slots) {
        const path =
          slot.kind === "imported" ? slot.path : uploadedById.get(slot.id);
        if (path) formData.append("imagePaths", path);
      }
    } catch (err) {
      setClientError(err instanceof Error ? err.message : "Upload failed.");
      return;
    } finally {
      setSubmitting(false);
    }
    startTransition(() => formAction(formData));
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {showGameFinder || showToriImport ? (
        <div className="flex flex-wrap items-center gap-2">
          {showGameFinder ? (
            <MetadataFinder
              defaultQuery={title}
              canAddCover={fileCount < MAX_IMAGES}
              onPick={onPickMetadata}
            />
          ) : null}
          {showToriImport ? (
            <ToriImport
              canAddCover={fileCount < MAX_IMAGES}
              onImport={onToriImport}
            />
          ) : null}
        </div>
      ) : null}

      <Field label="Title" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. The Legend of Zelda: Tears of the Kingdom"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Price (€)" htmlFor="priceEuros">
          <Input
            id="priceEuros"
            name="priceEuros"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            required
            value={priceEuros}
            onChange={(e) => setPriceEuros(e.target.value)}
            placeholder="25.00"
          />
        </Field>
        <Field
          label="Platform"
          htmlFor="platform"
          hint="Optional — e.g. PS5, Switch, PC"
        >
          {/* The single submitted value, kept in sync with chips / free-text. */}
          <input type="hidden" name="platform" value={platform} />
          {gamePlatforms.length > 0 ? (
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                {gamePlatforms.map((p) => {
                  const label = p.abbreviation ?? p.name;
                  const active = !platformOther && platform === label;
                  return (
                    <button
                      key={p.slug ?? label}
                      type="button"
                      onClick={() => {
                        setPlatformOther(false);
                        setPlatform(label);
                      }}
                      aria-pressed={active}
                      className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                        active
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border bg-surface-2 text-muted hover:border-accent/60 hover:text-ink"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    setPlatformOther(true);
                    setPlatform("");
                  }}
                  aria-pressed={platformOther}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                    platformOther
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-border bg-surface-2 text-muted hover:border-accent/60 hover:text-ink"
                  }`}
                >
                  Other…
                </button>
              </div>
              {platformOther ? (
                <Input
                  id="platform"
                  maxLength={40}
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  placeholder="e.g. Game & Watch"
                  autoFocus
                />
              ) : null}
            </div>
          ) : (
            <Input
              id="platform"
              maxLength={40}
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              placeholder="Switch"
            />
          )}
        </Field>
      </div>

      <Field
        label="Description"
        htmlFor="description"
        hint="Mention any wear, scratches, or missing parts here."
      >
        <Textarea
          id="description"
          name="description"
          required
          maxLength={4000}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Condition details, what's included, why you're selling…"
        />
      </Field>

      {allowImages ? (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Photos
          </span>
          {slots.length > 1 ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/10 px-2 py-1 text-xs text-accent">
              <GripVertical className="h-3.5 w-3.5 shrink-0" />
              Drag the photos to reorder — the first one is the listing cover.
            </span>
          ) : null}
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {slots.map((slot, i) => {
              const src =
                slot.kind === "imported"
                  ? publicImageUrl(slot.path)
                  : slot.previewUrl;
              return (
                <div
                  key={slot.id}
                  draggable
                  onDragStart={() => setDragIndex(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragIndex !== null) moveSlot(dragIndex, i);
                    setDragIndex(null);
                  }}
                  onDragEnd={() => setDragIndex(null)}
                  className={`group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-surface-2 active:cursor-grabbing ${
                    slot.kind === "imported" ? "border-accent/40" : "border-border"
                  } ${dragIndex === i ? "opacity-50 ring-2 ring-accent" : ""}`}
                >
                  <Image
                    src={src}
                    alt=""
                    fill
                    sizes="160px"
                    className="pointer-events-none object-cover"
                  />
                  {i === 0 ? (
                    <span className="absolute left-1 top-1 rounded bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                      Cover
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-bg/80 text-ink opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                    aria-label="Remove image"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
            {slots.length < MAX_IMAGES ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="grid aspect-square place-items-center rounded-lg border border-dashed border-border bg-surface text-muted transition-colors hover:border-accent hover:text-accent"
              >
                <ImagePlus className="h-6 w-6" />
              </button>
            ) : null}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(",")}
            multiple
            hidden
            onChange={(e) => addFiles(e.target.files)}
          />
          <span className="text-xs text-muted/80">
            Up to {MAX_IMAGES} images, 5 MB each.
          </span>
        </div>
      ) : null}

      {(clientError || state?.error) && (
        <p className="rounded-[var(--radius)] border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {clientError ?? state?.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" size="lg" disabled={isPending || submitting}>
          {isPending || submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
