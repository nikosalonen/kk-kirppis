import * as React from "react";
import { cn } from "@/lib/cn";

const fieldStyles =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3.5 text-ink placeholder:text-muted/70 transition-colors hover:border-ink/30 focus:border-ink focus:outline-none disabled:opacity-50";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldStyles, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(fieldStyles, "min-h-32 resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
}

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
