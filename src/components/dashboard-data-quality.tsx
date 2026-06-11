"use client";

import { FileSpreadsheet, RefreshCw, Rows3, ShieldCheck } from "lucide-react";
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
      <QualityChip icon={RefreshCw} label={`Refreshed: ${formatRefreshedAt(summary.refreshed_at)}`} />
      {summary.imported_spreadsheet_rows_included ? <QualityChip icon={FileSpreadsheet} label="Google Sheet with historical cases included" /> : null}
      {summary.user_rows_included ? <QualityChip icon={Rows3} label="User-submitted cases included" /> : null}
      <QualityChip icon={ShieldCheck} label={claimHandlingLabel(summary.claim_handling)} />
    </div>
  );
}

function QualityChip({
  icon: Icon,
  label,
}: {
  icon: LucideIcon;
  label: string;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-border bg-secondary/70 px-2 py-0.5">
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

function claimHandlingLabel(value: DashboardDataQualitySummary["claim_handling"]) {
  if (value === "canonical_claims_counted_once") return "Claimed historical cases are de-duplicated";
  return "Claims are handled";
}
