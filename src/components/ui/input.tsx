import * as React from "react";
import { ChevronDown } from "lucide-react";
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

// `className` sizes the wrapper, so width utilities work as on a plain select.
export function Select({
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(fieldStyles, "h-11 appearance-none pr-9")}
        {...props}
      />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
      />
    </div>
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
      {hint ? <span className="text-xs text-muted/80">{hint}</span> : null}
    </label>
  );
}
