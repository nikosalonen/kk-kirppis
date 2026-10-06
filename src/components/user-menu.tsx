"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { signOutAction } from "@/app/(app)/auth-actions";

// Avatar dropdown with the account links. Built on <details>, so it opens and
// closes without JS; the effect only adds closing on outside click and Escape.
export function UserMenu({
  name,
  image,
}: {
  name?: string | null;
  image?: string | null;
}) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const close = () => {
      if (ref.current) ref.current.open = false;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) close();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        close();
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const itemClass =
    "block w-full rounded-md px-3 py-2 text-left text-sm text-ink hover:bg-surface-2";

  return (
    <details ref={ref} className="relative">
      <summary
        aria-label="Account menu"
        className="flex cursor-pointer list-none items-center gap-1 rounded-full p-0.5 hover:bg-surface-2 [&::-webkit-details-marker]:hidden"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" className="h-8 w-8 rounded-full object-cover" />
        ) : (
          <span className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-xs font-medium text-muted">
            {(name ?? "?").slice(0, 2).toUpperCase()}
          </span>
        )}
        <ChevronDown className="h-4 w-4 text-muted" />
      </summary>
      <div className="absolute right-0 top-full z-50 mt-2 w-48 rounded-[var(--radius)] border border-border bg-surface p-1 shadow-lg">
        {name ? (
          <p className="truncate px-3 py-2 text-xs text-muted">{name}</p>
        ) : null}
        <Link
          href="/me"
          className={itemClass}
          onClick={() => {
            if (ref.current) ref.current.open = false;
          }}
        >
          My listings
        </Link>
        <form action={signOutAction}>
          <button type="submit" className={itemClass}>
            Sign out
          </button>
        </form>
      </div>
    </details>
  );
}
