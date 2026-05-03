import * as React from "react";
import { cn } from "@/lib/utils";

const toneClass = {
  blue: "border-primary/30 bg-primary/10 text-primary",
  green: "border-success/30 bg-success/10 text-success",
  amber: "border-warning/30 bg-warning/10 text-warning",
  red: "border-danger/30 bg-danger/10 text-danger",
  neutral: "border-border bg-surface-elevated text-muted",
};

const variantClass = {
  default: "border-transparent bg-primary text-primary-foreground",
  secondary: "border-transparent bg-secondary text-secondary-foreground",
  destructive: "border-transparent bg-destructive text-destructive-foreground",
  outline: "text-foreground",
};

export function Badge({
  className,
  variant,
  tone = "neutral",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof toneClass; variant?: keyof typeof variantClass }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
        variant ? variantClass[variant] : toneClass[tone],
        className,
      )}
      {...props}
    />
  );
}
