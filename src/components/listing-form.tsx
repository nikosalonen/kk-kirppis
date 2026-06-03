"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import Image from "next/image";
import { ImagePlus, Loader2, X } from "lucide-react";
import type { FormState } from "@/app/(app)/listings/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { CONDITIONS, MAX_IMAGES } from "@/lib/validation";
import { CONDITION_LABELS } from "@/lib/format";

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

type Defaults = {
  title?: string;
  description?: string;
  priceEuros?: string;
  condition?: string;
  platform?: string;
};

type UploadTarget = { path: string; signedUrl: string };

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
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults?: Defaults;
  allowImages?: boolean;
  submitLabel: string;
}) {
  const [state, formAction] = useActionState(action, undefined);
  const [isPending, startTransition] = useTransition();
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [clientError, setClientError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    setClientError(null);
    const next = [...files];
    const nextPreviews = [...previews];
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
      next.push(file);
      nextPreviews.push(URL.createObjectURL(file));
    }
    setFiles(next);
    setPreviews(nextPreviews);
    if (inputRef.current) inputRef.current.value = "";
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles(files.filter((_, i) => i !== index));
    setPreviews(previews.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setClientError(null);
    const formData = new FormData(e.currentTarget);
    try {
      const paths = await uploadImages(files);
      for (const path of paths) formData.append("imagePaths", path);
    } catch (err) {
      setClientError(err instanceof Error ? err.message : "Upload failed.");
      return;
    }
    startTransition(() => formAction(formData));
  }

  const busy = isPending;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <Field label="Title" htmlFor="title">
        <Input
          id="title"
          name="title"
          required
          maxLength={120}
          defaultValue={defaults?.title}
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
            defaultValue={defaults?.priceEuros}
            placeholder="25.00"
          />
        </Field>
        <Field label="Condition" htmlFor="condition">
          <Select
            id="condition"
            name="condition"
            required
            defaultValue={defaults?.condition ?? "GOOD"}
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {CONDITION_LABELS[c]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Platform" htmlFor="platform" hint="Optional — e.g. PS5, Switch, PC">
        <Input
          id="platform"
          name="platform"
          maxLength={40}
          defaultValue={defaults?.platform}
          placeholder="Switch"
        />
      </Field>

      <Field label="Description" htmlFor="description">
        <Textarea
          id="description"
          name="description"
          required
          maxLength={4000}
          defaultValue={defaults?.description}
          placeholder="Condition details, what's included, why you're selling…"
        />
      </Field>

      {allowImages ? (
        <div className="flex flex-col gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-muted">
            Photos
          </span>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {previews.map((src, i) => (
              <div
                key={src}
                className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-surface-2"
              >
                <Image src={src} alt="" fill className="object-cover" />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-md bg-bg/80 text-ink opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                  aria-label="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
            {files.length < MAX_IMAGES ? (
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
        <Button type="submit" size="lg" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
