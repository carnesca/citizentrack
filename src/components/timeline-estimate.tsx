"use client";

import { CalendarDays } from "lucide-react";
import type { ApplicationTimelinePrediction, TimelinePrediction, TimelinePredictionMetadata } from "@/lib/types";
import { lawTypeLabel } from "@/lib/utils";

type TimelineEstimateProps = {
  prediction: ApplicationTimelinePrediction | TimelinePrediction | null | undefined;
};

export function TimelineEstimate({ prediction }: TimelineEstimateProps) {
  if (!prediction) {
    return (
      <section className="rounded-2xl bg-primary/5 px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          Estimated certificate window
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Your estimated timeline will appear after this application is saved or updated.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">Last refreshed: Not yet generated</p>
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
}: {
  milestone: string;
  start: string | null;
  end: string | null;
  confidence: TimelinePrediction["confidence"];
  comparableCases: number;
  metadata: TimelinePredictionMetadata;
  refreshedAt: string | null;
}) {
  const range = getWindowRange(start, end);
  const title = getTimelineTitle(milestone);
  const law = lawTypeLabel(metadata.matched_law_type.display_name);
  const confidenceLabel = toTitleCase(confidence);
  const refreshedLabel = refreshedAt ? formatDateTime(refreshedAt) : null;

  if (!range) {
    return (
      <section className="rounded-2xl bg-primary/5 px-4 py-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
          {title}
        </div>
        <p className="mt-2 text-sm text-muted-foreground">There is not enough date information to visualize this forecast yet.</p>
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {confidenceLabel} confidence · Based on {formatCount(comparableCases)} comparable {law} cases
        </p>
        {refreshedLabel ? <p className="mt-2 text-xs text-muted-foreground">Last refreshed: {refreshedLabel}</p> : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[linear-gradient(135deg,color-mix(in_srgb,var(--primary)_10%,transparent),transparent_45%),color-mix(in_srgb,var(--surface-elevated)_76%,transparent)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
            {title}
          </div>
          <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{range.monthsLabel}</p>
        </div>
        <p className="max-w-md text-sm leading-6 text-muted-foreground sm:text-right">
          <span className={getConfidenceTextClass(confidence)}>{confidenceLabel} confidence</span> · Based on{" "}
          <span className="font-medium text-foreground">{formatCount(comparableCases)}</span> comparable {law} cases
          {refreshedLabel ? <span className="block text-xs">Last refreshed: {refreshedLabel}</span> : null}
        </p>
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
    </section>
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

function getConfidenceTextClass(confidence: TimelinePrediction["confidence"]) {
  if (confidence === "high") return "font-medium text-success";
  if (confidence === "medium") return "font-medium text-warning";
  return "font-medium text-destructive";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
