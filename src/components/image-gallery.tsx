"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ChevronLeft,
  ChevronRight,
  ImageOff,
  X,
  ZoomIn,
} from "lucide-react";

// A buyer-facing gallery: a large cover plus thumbnails, where clicking any
// image opens a full-size lightbox with prev/next navigation. All `src` values
// are already public URLs resolved server-side.
export function ImageGallery({
  images,
  title,
  sold,
}: {
  images: string[];
  title: string;
  sold: boolean;
}) {
  // Index of the image shown in the lightbox, or null when it's closed.
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const isOpen = openIdx !== null;
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => setOpenIdx(null), []);
  const step = useCallback(
    (delta: number) =>
      setOpenIdx((i) =>
        i === null ? i : (i + delta + images.length) % images.length,
      ),
    [images.length],
  );

  // Lock scroll and wire arrow/Escape keys while the lightbox is open.
  useEffect(() => {
    if (openIdx === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [openIdx, close, step]);

  // Move focus into the lightbox on open and return it to the trigger on close.
  // Keyed on open/closed (not openIdx) so arrow-key navigation doesn't refocus.
  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    return () => previouslyFocused?.focus?.();
  }, [isOpen]);

  if (images.length === 0) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius)] border border-border bg-surface-2">
        <div className="grid h-full place-items-center text-border">
          <ImageOff className="h-12 w-12" />
        </div>
      </div>
    );
  }

  const [cover, ...rest] = images;

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setOpenIdx(0)}
        aria-label="Enlarge image"
        className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-[var(--radius)] border border-border bg-surface-2"
      >
        <Image
          src={cover}
          alt={title}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 600px"
          className={`object-cover ${sold ? "opacity-50 grayscale" : ""}`}
        />
        <span className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-md bg-bg/70 text-ink opacity-0 transition-opacity group-hover:opacity-100">
          <ZoomIn className="h-4 w-4" />
        </span>
      </button>

      {rest.length > 0 ? (
        <div className="grid grid-cols-4 gap-3">
          {rest.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => setOpenIdx(i + 1)}
              aria-label="Enlarge image"
              className="group relative aspect-square cursor-zoom-in overflow-hidden rounded-lg border border-border bg-surface-2 transition-colors hover:border-accent/60"
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

      {openIdx !== null ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-bg/90 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — image ${openIdx + 1} of ${images.length}`}
          onClick={close}
        >
          <button
            ref={closeBtnRef}
            type="button"
            onClick={close}
            className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-md bg-surface/80 text-ink transition-colors hover:text-accent"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {images.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-ink transition-colors hover:text-accent"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-surface/80 text-ink transition-colors hover:text-accent"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          ) : null}

          <div
            className="relative flex h-[80vh] w-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={images[openIdx]}
              alt={`${title} — image ${openIdx + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {images.length > 1 ? (
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-surface/80 px-3 py-1 font-mono text-xs text-muted">
              {openIdx + 1} / {images.length}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
