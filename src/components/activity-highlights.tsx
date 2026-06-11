"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight, CheckCircle2, PlusCircle } from "lucide-react";
import type { DashboardActivityHighlights, LawTypeStat } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ActivityHighlights({
  highlights,
  laws,
}: {
  highlights: DashboardActivityHighlights | null;
  laws: LawTypeStat[];
}) {
  if (!highlights) return null;

  const mostActiveApplicationLawType =
    highlights.most_active_application_law_type?.display_name ?? getMostActiveLawType(laws, "total");
  const mostActiveApprovalLawType =
    highlights.most_active_approved_law_type?.display_name ?? getMostActiveLawType(laws, "approved");

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="gap-0 border-border bg-card">
        <CardHeader className="pb-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <PlusCircle className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg">Latest Application Activity</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">Recently added and updated user cases</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric
              label="Added Today"
              value={formatCount(highlights.applications_added_today ?? 0)}
            />
            <Metric
              label="Updated Today"
              value={formatCount(highlights.applications_updated_today ?? 0)}
            />
            <Metric
              label="Added Last 7 Days"
              value={formatCount(highlights.applications_added_last_7_days ?? 0)}
              trend={getTrend(highlights.applications_added_last_7_days ?? 0, highlights.applications_added_previous_7_days ?? 0)}
            />
            <Metric
              label="Updated Last 7 Days"
              value={formatCount(highlights.applications_updated_last_7_days ?? 0)}
              trend={getTrend(highlights.applications_updated_last_7_days ?? 0, highlights.applications_updated_previous_7_days ?? 0)}
            />
            <Metric
              label="Added vs. Previous Period"
              value={formatSignedCount((highlights.applications_added_last_7_days ?? 0) - (highlights.applications_added_previous_7_days ?? 0))}
              trend={getTrend(highlights.applications_added_last_7_days ?? 0, highlights.applications_added_previous_7_days ?? 0)}
            />
            <Metric
              label="Updated vs. Previous Period"
              value={formatSignedCount((highlights.applications_updated_last_7_days ?? 0) - (highlights.applications_updated_previous_7_days ?? 0))}
              trend={getTrend(highlights.applications_updated_last_7_days ?? 0, highlights.applications_updated_previous_7_days ?? 0)}
            />
            <Metric
              label="Most Active Law Type"
              value={mostActiveApplicationLawType}
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
                <p className="mt-1 text-sm text-muted-foreground">Recently recorded certificate dates</p>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-t border-border pt-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label={`Recent Approvals (${getRecentApprovalDays(highlights)} Days)`}
                value={formatCount(getRecentApprovalCount(highlights))}
              />
              <Metric
                label="Approvals vs. Previous Period"
                value={formatSignedCount(highlights.approvals_recent_period_change ?? 0)}
                trend={getTrend(getRecentApprovalCount(highlights), highlights.approvals_previous_period_count ?? 0)}
              />
              <Metric
                label="Most Active Law Type"
                value={mostActiveApprovalLawType}
              />
              <Metric
                label="Latest Approval Date"
                value={formatDate(highlights.latest_approval_recorded_on)}
              />
            </div>
          </div>

          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-3">
            <Metric label="Submitted to File Number" value={formatMonths(highlights.avg_approved_submission_to_file_months)} />
            <Metric label="File Number to Certificate" value={formatMonths(highlights.avg_approved_file_to_certificate_months)} />
            <Metric label="Total Approved Timeline" value={formatMonths(highlights.avg_approved_total_months)} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type Trend = "increasing" | "decreasing" | "flat";

function Metric({ label, value, trend }: { label: string; value: string; trend?: Trend }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium leading-5 text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <p className="font-mono text-lg font-semibold text-foreground">{value}</p>
        {trend ? <TrendIcon trend={trend} /> : null}
      </div>
    </div>
  );
}

function TrendIcon({ trend }: { trend: Trend }) {
  const Icon = trend === "increasing" ? ArrowUpRight : trend === "decreasing" ? ArrowDownRight : ArrowRight;
  return (
    <span className={trendClassName(trend)} aria-label={toTrendLabel(trend)} title={toTrendLabel(trend)}>
      <Icon className="h-4 w-4" />
    </span>
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

function formatMonths(value: number | null) {
  if (value === null || Number.isNaN(value)) return "n/a";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mo`;
}

function formatCount(value: number) {
  return value.toLocaleString("en-US");
}

function formatSignedCount(value: number) {
  if (value > 0) return `+${formatCount(value)}`;
  return formatCount(value);
}

function getRecentApprovalDays(highlights: DashboardActivityHighlights) {
  return highlights.approvals_recent_period_days ?? 30;
}

function getRecentApprovalCount(highlights: DashboardActivityHighlights) {
  return highlights.approvals_recent_period_count ?? highlights.applications_approved_last_30_days;
}

function getMostActiveLawType(laws: LawTypeStat[], field: "total" | "approved") {
  const law = [...laws]
    .filter((entry) => entry[field] > 0)
    .sort((a, b) => b[field] - a[field] || a.sort_order - b.sort_order || a.display_name.localeCompare(b.display_name))[0];
  return law?.display_name ?? "n/a";
}

function getTrend(current: number, previous: number): Trend {
  if (current > previous) return "increasing";
  if (current < previous) return "decreasing";
  return "flat";
}

function toTrendLabel(trend: Trend) {
  if (trend === "increasing") return "Increasing";
  if (trend === "decreasing") return "Decreasing";
  return "Flat";
}

function trendClassName(trend: Trend) {
  if (trend === "increasing") return "text-success";
  if (trend === "decreasing") return "text-danger";
  return "text-muted-foreground";
}
