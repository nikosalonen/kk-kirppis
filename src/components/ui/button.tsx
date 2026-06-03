import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius)] font-medium tracking-tight transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-hard hover:-translate-y-px hover:bg-accent-dim active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
        outline:
          "border border-border bg-surface text-ink hover:border-accent hover:text-accent",
        ghost: "text-muted hover:bg-surface-2 hover:text-ink",
        danger:
          "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-5 text-sm",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
