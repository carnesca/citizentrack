"use client";

import { CheckCircle2, PlusCircle } from "lucide-react";
import type { DashboardActivityHighlights } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityHighlights({
  highlights,
}: {
  highlights: DashboardActivityHighlights | null;
}) {
  if (!highlights) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-0 border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <PlusCircle className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Latest Application Activity</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Most recent application added</p>
              </div>
            </div>
            <Badge tone="blue" className="justify-self-start px-2.5 py-1 sm:justify-self-end">
              {formatCount(highlights.applications_added_last_30_days)} added in last 30 days
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {formatDateTime(highlights.latest_application_added_at)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Latest update: {formatDateTime(highlights.latest_application_updated_at)}
            </p>
          </div>

          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <Metric
              label={latestActivityDayLabel(highlights.latest_application_activity_on)}
              value={`${formatCount(highlights.applications_added_on_latest_activity_day ?? 0)} added`}
            />
            <Metric
              label="Updated that day"
              value={formatCount(highlights.applications_updated_on_latest_activity_day ?? 0)}
            />
            <Metric
              label="Updated last 7 days"
              value={formatCount(highlights.applications_updated_last_7_days ?? 0)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <ActivityStat
              label="Updated in last 30 days"
              value={formatCount(highlights.applications_updated_last_30_days ?? 0)}
            />
            <ActivityStat
              label="Active in last 30 days"
              value={formatCount(highlights.applications_active_last_30_days ?? highlights.applications_added_last_30_days)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="gap-0 border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-success/10 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg">Latest Approval Activity</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">Most recent certificate received</p>
              </div>
            </div>
            <Badge tone="green" className="justify-self-start px-2.5 py-1 sm:justify-self-end">
              {formatCount(highlights.applications_approved_last_30_days)} approved in last 30 days
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-mono text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {formatDate(highlights.latest_approval_recorded_on)}
            </p>
          </div>

          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <Metric label="Submitted to file number" value={formatMonths(highlights.avg_approved_submission_to_file_months)} />
            <Metric label="File number to certificate" value={formatMonths(highlights.avg_approved_file_to_certificate_months)} />
            <Metric label="Total approved timeline" value={formatMonths(highlights.avg_approved_total_months)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium leading-5 text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function ActivityStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-secondary/55 px-3 py-2">
      <p className="text-xs font-medium leading-5 text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function formatDate(value: string | null) {
  if (!value) return "No approvals yet";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatDateTime(value: string | null) {
  if (!value) return "No activity yet";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function latestActivityDayLabel(value: string | null | undefined) {
  if (!value) return "Added that day";
  return `Added ${formatShortDate(value)}`;
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatMonths(value: number | null) {
  if (value === null || Number.isNaN(value)) return "n/a";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mo`;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}
