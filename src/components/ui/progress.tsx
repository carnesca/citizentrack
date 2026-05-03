"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export function Progress({
  className,
  value = 0,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { value?: number | null }) {
  const boundedValue = Math.max(0, Math.min(100, value ?? 0));

  return (
    <div
      data-slot="progress"
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", className)}
      {...props}
    >
      <div
        data-slot="progress-indicator"
        className="h-full w-full flex-1 rounded-full bg-primary transition-transform"
        style={{ transform: `translateX(-${100 - boundedValue}%)` }}
      />
    </div>
  );
}
