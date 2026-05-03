import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[linear-gradient(180deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.10)_inset,0_12px_30px_color-mix(in_srgb,var(--primary)_22%,transparent)] hover:bg-primary-pressed hover:brightness-105 active:brightness-95",
        primary: "bg-[linear-gradient(180deg,var(--primary-soft),var(--primary))] text-primary-foreground shadow-[0_0_0_1px_rgba(255,255,255,0.10)_inset,0_12px_30px_color-mix(in_srgb,var(--primary)_22%,transparent)] hover:bg-primary-pressed hover:brightness-105 active:brightness-95",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        danger: "bg-destructive/15 text-destructive hover:bg-destructive/25",
        outline: "border border-border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        md: "h-10 px-4",
        sm: "h-8 px-3 text-sm",
        lg: "h-10 px-6",
        icon: "h-10 w-10 p-0",
        "icon-sm": "h-8 w-8 p-0",
        "icon-lg": "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  },
);

export function Button({
  className,
  variant,
  size,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
