"use client";

import { RefreshCw } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DashboardDataQualitySummary } from "@/lib/types";

type DashboardDataQualityProps = {
  summary: DashboardDataQualitySummary;
  className?: string;
};

export function getDashboardDataQualitySummary({
  refreshedAt,
}: {
  refreshedAt: string;
}): DashboardDataQualitySummary {
  return {
    refreshed_at: refreshedAt,
    imported_spreadsheet_rows_included: true,
    user_rows_included: true,
    claim_handling: "canonical_claims_counted_once",
  };
}

export function DashboardDataQuality({
  summary,
  className,
}: DashboardDataQualityProps) {
  return (
    <div className={["flex flex-wrap gap-1.5 text-[0.68rem] leading-5 text-muted-foreground", className].filter(Boolean).join(" ")}>
      <QualityChip icon={RefreshCw} label={`Refreshed: ${formatRefreshedAt(summary.refreshed_at)}`} title="Dashboard statistics refresh automatically from aggregate application data." />
    </div>
  );
}

function QualityChip({
  icon: Icon,
  label,
  title,
}: {
  icon: LucideIcon;
  label: string;
  title?: string;
}) {
  return (
    <span title={title} className="inline-flex max-w-full items-center gap-1 rounded-md border border-border/70 bg-secondary/70 px-2 py-0.5">
      <Icon className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </span>
  );
}

function formatRefreshedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return "Pending";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}
