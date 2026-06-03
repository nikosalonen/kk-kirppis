import * as React from "react";
import { cn } from "@/lib/cn";

const fieldStyles =
  "w-full rounded-[var(--radius)] border border-border bg-surface px-3.5 text-ink placeholder:text-muted/60 transition-colors hover:border-border focus:border-accent focus:outline-none";

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

export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(fieldStyles, "h-11 appearance-none pr-9", className)}
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
      <span className="font-mono text-xs uppercase tracking-wider text-muted">
        {label}
      </span>
      {children}
      {hint ? <span className="text-xs text-muted/80">{hint}</span> : null}
    </label>
  );
}
