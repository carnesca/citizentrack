"use client";

import { AlertTriangle, CalendarDays, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ApplicationTimelinePrediction, TimelineEstimateWindow, TimelinePrediction, TimelinePredictionMetadata } from "@/lib/types";
import { lawTypeLabel } from "@/lib/utils";

type TimelineEstimateProps = {
  prediction: ApplicationTimelinePrediction | TimelinePrediction | null | undefined;
  applicationLawTypeId?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export function TimelineEstimate({
  prediction,
  applicationLawTypeId,
  refreshing = false,
  onRefresh,
}: TimelineEstimateProps) {
  const hasStag5Context = applicationLawTypeId === "5_stag_erklarung";

  if (!prediction) {
    return (
      <section className="rounded-2xl bg-primary/5 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              Estimated certificate window
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Your estimated timeline will appear after this application is saved or updated.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Last refreshed: Not yet generated</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <RefreshEstimateButton refreshing={refreshing} onRefresh={onRefresh} />
          </div>
        </div>
        {hasStag5Context ? (
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Official BVA StAG 5 workload context will appear here after the estimate is generated.
          </p>
        ) : null}
      </section>
    );
  }

  return (
    <EstimateWindow
      milestone={toTitleCase(prediction.predicted_next_milestone)}
      start={prediction.date_range_start}
      end={prediction.date_range_end}
      confidence={prediction.confidence}
      comparableCases={prediction.similar_cases_count}
      metadata={prediction.metadata}
      refreshedAt={"created_at" in prediction ? prediction.created_at : null}
      refreshing={refreshing}
      onRefresh={onRefresh}
    />
  );
}

function EstimateWindow({
  milestone,
  start,
  end,
  confidence,
  comparableCases,
  metadata,
  refreshedAt,
  refreshing,
  onRefresh,
}: {
  milestone: string;
  start: string | null;
  end: string | null;
  confidence: TimelinePrediction["confidence"];
  comparableCases: number;
  metadata: TimelinePredictionMetadata;
  refreshedAt: string | null;
  refreshing: boolean;
  onRefresh?: () => void;
}) {
  const primaryWindow = metadata.primary_window ?? fallbackWindowFromPrediction(milestone, start, end, comparableCases);
  const range = getWindowRange(primaryWindow.date_range_start, primaryWindow.date_range_end);
  const title = getTimelineTitle(milestone);
  const law = lawTypeLabel(metadata.matched_law_type.display_name);
  const confidenceLabel = toTitleCase(confidence);
  const refreshedLabel = refreshedAt ? formatDateTime(refreshedAt) : null;
  const secondaryWindows = metadata.secondary_windows ?? [];

  if (!range) {
    return (
      <section className="rounded-2xl bg-primary/5 px-4 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
              {title}
            </div>
            <p className="mt-2 text-sm text-muted-foreground">There is not enough date information to visualize this forecast yet.</p>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {confidenceLabel} confidence · Based on {formatCount(comparableCases)} comparable {law} cases
            </p>
            {refreshedLabel ? <p className="mt-2 text-xs text-muted-foreground">Last refreshed: {refreshedLabel}</p> : null}
          </div>
          <RefreshEstimateButton refreshing={refreshing} onRefresh={onRefresh} />
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_45%),color-mix(in_srgb,var(--surface-elevated)_76%,transparent)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            {primaryWindow.is_overdue ? (
              <AlertTriangle className="h-4 w-4 text-warning" aria-hidden="true" />
            ) : (
              <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
            {primaryWindow.label || title}
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {primaryWindow.is_overdue ? "Typical window has passed" : range.monthsLabel}
          </p>
          {primaryWindow.is_overdue ? (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              {primaryWindow.overdue_message ?? "The typical timing window for comparable cases has already passed."}
            </p>
          ) : null}
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-right">
            <span className={getConfidenceTextClass(confidence)}>{confidenceLabel} confidence</span> · Based on{" "}
            <span className="font-medium text-foreground">{formatCount(comparableCases)}</span> comparable {law} cases
            {refreshedLabel ? <span className="block text-xs">Last refreshed: {refreshedLabel}</span> : null}
          </p>
          <RefreshEstimateButton refreshing={refreshing} onRefresh={onRefresh} />
        </div>
      </div>

      <div className="mt-6" aria-label={`${title}: ${range.monthsLabel}`}>
        <div className="grid gap-3 text-xs sm:grid-cols-3">
          <TimelineDate label="Today" date={new Date()} />
          <TimelineDate label="Earliest" date={range.startDate} className="sm:text-center" />
          <TimelineDate label="Latest" date={range.endDate} className="sm:text-right" />
        </div>

        <div className="mt-4">
          <div className="relative h-4 rounded-full bg-secondary" aria-hidden="true">
            <div className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-card bg-background shadow-sm" />
            <div
              className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--primary),var(--success))] shadow-[0_10px_28px_color-mix(in_srgb,var(--primary)_18%,transparent)]"
              style={{ left: `${range.startPercent}%`, width: `${range.widthPercent}%` }}
            />
            <div
              className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-primary shadow-md"
              style={{ left: `${range.startPercent}%` }}
            />
            <div
              className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-success shadow-md"
              style={{ left: `${range.endPercent}%` }}
            />
          </div>
        </div>
      </div>

      {secondaryWindows.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {secondaryWindows.map((window) => (
            <SecondaryWindow key={window.id} window={window} />
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 text-sm lg:grid-cols-[1fr_1fr]">
        <div className="rounded-xl bg-background/35 px-3 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Estimate basis</p>
          <p className="mt-1 leading-6 text-foreground">
            Uses {formatCount(primaryWindow.comparable_cases_count)} {law} cases with the relevant dates for this estimate.
          </p>
          {metadata.confidence_basis ? <p className="mt-1 text-xs leading-5 text-muted-foreground">{metadata.confidence_basis}</p> : null}
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{metadata.confidence_reason}</p>
        </div>
        {metadata.comparison ? (
          <div className="rounded-xl bg-background/35 px-3 py-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your case compared to others</p>
            <p className="mt-1 leading-6 text-foreground">{metadata.comparison.status_label}</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {formatComparison(metadata.comparison)}
            </p>
          </div>
        ) : null}
      </div>

      <BvaEstimateContext metadata={metadata} />
    </section>
  );
}

function RefreshEstimateButton({ refreshing, onRefresh }: { refreshing: boolean; onRefresh?: () => void }) {
  if (!onRefresh) return null;

  return (
    <Button type="button" variant="outline" size="sm" className="w-full bg-background/40 sm:w-auto" onClick={onRefresh} disabled={refreshing}>
      <RefreshCw className={["h-4 w-4", refreshing ? "animate-spin" : ""].filter(Boolean).join(" ")} />
      {refreshing ? "Refreshing..." : "Refresh estimate"}
    </Button>
  );
}

function BvaEstimateContext({ metadata }: { metadata: TimelinePredictionMetadata }) {
  const bva = metadata.bva_official_data;
  if (!bva.included) return null;

  return (
    <div className="mt-4 rounded-xl bg-background/35 px-3 py-3 text-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="font-medium text-foreground">Official BVA StAG 5 context</p>
        {bva.latest_period_label ? <p className="text-xs text-muted-foreground">{bva.latest_period_label}</p> : null}
      </div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        BVA reported {formatOptionalCount(bva.latest_backlog)} StAG 5 cases in backlog
        {bva.recent_average_monthly_processed != null
          ? ` and recently processed about ${formatCount(bva.recent_average_monthly_processed)} cases per month`
          : ""}
        . This is workload context only; it is not used to calculate your applicant-level estimate.
      </p>
    </div>
  );
}

function SecondaryWindow({ window }: { window: TimelineEstimateWindow }) {
  const start = window.date_range_start ? parseDateOnly(window.date_range_start) : null;
  const end = window.date_range_end ? parseDateOnly(window.date_range_end) : null;

  return (
    <div className="rounded-xl bg-background/35 px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{window.label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">
        {window.is_overdue ? "Typical window passed" : start && end ? `${formatShortDate(start)} - ${formatShortDate(end)}` : "No data"}
      </p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        {window.typical_months != null ? `${formatMonths(window.typical_months)} typical · ` : ""}
        {formatCount(window.comparable_cases_count)} comparable cases
      </p>
    </div>
  );
}

function TimelineDate({ label, date, className }: { label: string; date: Date; className?: string }) {
  return (
    <div className={className}>
      <p className="font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-muted-foreground">{formatShortDate(date)}</p>
    </div>
  );
}

function getTimelineTitle(milestone: string) {
  const normalized = milestone.toLowerCase();
  if (normalized.includes("file number")) return "Estimated file number window";
  if (normalized.includes("completed")) return "Completed timeline";
  return "Estimated certificate window";
}

function toTitleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getWindowRange(start: string | null, end: string | null) {
  if (!start || !end) return null;

  const today = startOfDay(new Date());
  const startDate = parseDateOnly(start);
  const endDate = parseDateOnly(end);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const totalDays = Math.max(1, daysBetween(today, endDate));
  const daysToStart = Math.max(0, daysBetween(today, startDate));
  const daysToEnd = Math.max(daysToStart + 1, daysBetween(today, endDate));
  const startPercent = Math.max(10, Math.min(84, Math.round((daysToStart / totalDays) * 100)));
  const endPercent = Math.max(startPercent + 10, Math.min(96, Math.round((daysToEnd / totalDays) * 100)));
  const widthPercent = Math.max(10, endPercent - startPercent);
  const monthsToStart = Math.max(0, Math.round(daysToStart / 30.4375));
  const monthsToEnd = Math.max(monthsToStart, Math.round(daysToEnd / 30.4375));

  return {
    startDate,
    endDate,
    startPercent,
    endPercent,
    widthPercent,
    monthsLabel: `${monthsToStart}–${monthsToEnd} months`,
  };
}

function fallbackWindowFromPrediction(
  milestone: string,
  start: string | null,
  end: string | null,
  comparableCases: number,
): TimelineEstimateWindow {
  const label = getTimelineTitle(milestone);
  const endDate = end ? parseDateOnly(end) : null;
  const isOverdue = Boolean(endDate && endDate < startOfDay(new Date()));

  return {
    id: label.toLowerCase().includes("file number") ? "file_number" : "certificate",
    label,
    date_range_start: start,
    date_range_end: end,
    typical_months: null,
    comparable_cases_count: comparableCases,
    is_overdue: isOverdue,
    overdue_message: isOverdue ? `The typical ${label.toLowerCase()} has already passed based on comparable cases.` : null,
  };
}

function parseDateOnly(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return new Date(Number.NaN);
  return startOfDay(new Date(year, month - 1, day));
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function daysBetween(start: Date, end: Date) {
  return Math.ceil((end.getTime() - start.getTime()) / 86_400_000);
}

function formatShortDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatMonths(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mo`;
}

function formatComparison(comparison: NonNullable<TimelinePredictionMetadata["comparison"]>) {
  const parts = [];
  if (comparison.elapsed_submission_months != null) {
    parts.push(`${formatMonths(comparison.elapsed_submission_months)} since submission`);
  }
  if (comparison.average_completed_submission_to_certificate_months != null) {
    parts.push(`${formatMonths(comparison.average_completed_submission_to_certificate_months)} average completed timeline`);
  }
  if (comparison.average_pending_wait_months != null) {
    parts.push(`${formatMonths(comparison.average_pending_wait_months)} average pending wait`);
  }
  return parts.length ? parts.join(" · ") : "Add more milestone dates to compare this case more precisely.";
}

function getConfidenceTextClass(confidence: TimelinePrediction["confidence"]) {
  if (confidence === "high") return "font-medium text-success";
  if (confidence === "medium") return "font-medium text-warning";
  return "font-medium text-destructive";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatOptionalCount(value: number | null | undefined) {
  if (value == null) return "an unknown number of";
  return formatCount(value);
}
