"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCheck } from "lucide-react";
import type { ApprovalQueueCohort, ApprovalQueueStats, LawTypeStat } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";

type QueueMode = "year" | "month";

type QueuePoint = {
  period_key: string;
  period_label: string;
  approved_count: number;
};

export function ApprovalQueueChart({ stats, laws }: { stats: ApprovalQueueStats | null; laws: LawTypeStat[] }) {
  const [chartReady, setChartReady] = useState(false);
  const [mode, setMode] = useState<QueueMode>("month");
  const [selectedLawType, setSelectedLawType] = useState("");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const lawOptions = useMemo(
    () => laws.filter((law) => law.approved > 0).sort((a, b) => a.sort_order - b.sort_order),
    [laws],
  );
  const chartData = useMemo(
    () => aggregateCohorts(stats?.cohorts ?? [], mode, selectedLawType),
    [stats?.cohorts, mode, selectedLawType],
  );
  const monthlyQueueData = useMemo(
    () => aggregateCohorts(stats?.cohorts ?? [], "month", selectedLawType),
    [stats?.cohorts, selectedLawType],
  );
  const queuePosition = useMemo(() => getQueuePosition(monthlyQueueData), [monthlyQueueData]);
  const approvedCases = useMemo(
    () => monthlyQueueData.reduce((total, point) => total + point.approved_count, 0),
    [monthlyQueueData],
  );
  const selectedLawName =
    lawOptions.find((law) => law.law_type_id === selectedLawType)?.display_name ?? "All application types";
  const queueBasis = stats?.recent_approval_window_label
    ? `Based on approvals recorded ${stats.recent_approval_window_label}`
    : "Based on approved cases with submission dates";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-4 pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <CheckCheck className="h-5 w-5 text-success" />
              Approval Queue Position
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Where the BVA appears to be in the queue, based on submission months with a recent cluster of approvals.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[18rem] sm:flex-row sm:items-center">
            <Select
              value={selectedLawType}
              onChange={(event) => setSelectedLawType(event.target.value)}
              aria-label="Filter approval queue by application type"
              className="h-9 min-w-0 sm:w-[13rem]"
            >
              <option value="">All application types</option>
              {lawOptions.map((law) => (
                <option key={law.law_type_id} value={law.law_type_id}>
                  {law.display_name}
                </option>
              ))}
            </Select>
            <div className="flex w-fit rounded-md border border-border bg-secondary p-1">
              <Button
                type="button"
                size="sm"
                variant={mode === "month" ? "default" : "ghost"}
                className="h-7 px-3"
                onClick={() => setMode("month")}
              >
                Month
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "year" ? "default" : "ghost"}
                className="h-7 px-3"
                onClick={() => setMode("year")}
              >
                Year
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <QueueMetric label="Estimated BVA Queue Position" value={queuePosition} detail={queueBasis} />
          <QueueMetric label="Recent Approvals Included" value={formatNumber(approvedCases)} detail={selectedLawName} />
        </div>

        <div className="h-[18rem] w-full min-w-0 sm:h-[320px]">
          {chartReady && chartData.length ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="period_label"
                  interval="preserveStartEnd"
                  minTickGap={mode === "month" ? 22 : 8}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  tickFormatter={(value) => formatTick(String(value), mode)}
                />
                <YAxis
                  width={32}
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{
                    fill: "var(--accent)",
                    fillOpacity: 0.48,
                    radius: 6,
                    stroke: "var(--primary)",
                    strokeOpacity: 0.16,
                    strokeWidth: 1,
                  }}
                  formatter={(value, name) => {
                    if (name === "Recent approvals") return [formatNumber(Number(value)), name];
                    return [value, name];
                  }}
                  labelFormatter={(label) => `Submitted ${label}`}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Bar
                  dataKey="approved_count"
                  name="Recent approvals"
                  fill="var(--success)"
                  radius={[5, 5, 0, 0]}
                  activeBar={{ stroke: "var(--foreground)", strokeOpacity: 0.22, strokeWidth: 1 }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : chartReady ? (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border bg-secondary/40 px-4 text-center text-sm text-muted-foreground">
              No approved cases with submission dates are available for this application type yet.
            </div>
          ) : (
            <div className="h-full rounded-lg border border-border bg-secondary" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QueueMetric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold text-foreground">{value}</div>
      {detail ? <div className="mt-1 text-xs text-muted-foreground">{detail}</div> : null}
    </div>
  );
}

function aggregateCohorts(cohorts: ApprovalQueueCohort[], mode: QueueMode, lawTypeId: string): QueuePoint[] {
  if (mode === "month") {
    return cohorts
      .map((cohort) => ({
        period_key: cohort.period_key,
        period_label: cohort.period_label,
        approved_count: getApprovedCount(cohort, lawTypeId),
      }))
      .filter((point) => point.approved_count > 0)
      .sort((a, b) => a.period_key.localeCompare(b.period_key));
  }

  const yearly = new Map<number, QueuePoint>();

  for (const cohort of cohorts) {
    const approvedCount = getApprovedCount(cohort, lawTypeId);
    if (!approvedCount) continue;

    const existing =
      yearly.get(cohort.year_number) ??
      ({
        period_key: String(cohort.year_number),
        period_label: String(cohort.year_number),
        approved_count: 0,
      } satisfies QueuePoint);

    existing.approved_count += approvedCount;
    yearly.set(cohort.year_number, existing);
  }

  return Array.from(yearly.values()).sort((a, b) => a.period_key.localeCompare(b.period_key));
}

function getApprovedCount(cohort: ApprovalQueueCohort, lawTypeId: string) {
  const hasRecentCounts = typeof cohort.recent_approved_count === "number";
  const recentBreakdown = cohort.recent_law_type_breakdown;

  if (!lawTypeId) return cohort.recent_approved_count ?? cohort.approved_count;
  if (hasRecentCounts) {
    return recentBreakdown?.find((law) => law.law_type_id === lawTypeId)?.approved_count ?? 0;
  }

  return (
    cohort.law_type_breakdown?.find((law) => law.law_type_id === lawTypeId)?.approved_count ??
    0
  );
}

function getQueuePosition(points: QueuePoint[]) {
  if (!points.length) return "n/a";

  const peak = Math.max(...points.map((point) => point.approved_count));
  const threshold = getQueueThreshold(peak);
  const activeCluster = points.filter((point) => point.approved_count >= threshold);
  const queuePoint = activeCluster[activeCluster.length - 1] ?? points.find((point) => point.approved_count === peak);

  return queuePoint?.period_label ?? "n/a";
}

function getQueueThreshold(peak: number) {
  if (peak >= 6) return Math.ceil(peak * 0.4);
  if (peak >= 3) return 2;
  return 1;
}

function formatTick(value: string, mode: QueueMode) {
  if (mode === "year") return value;
  return value;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}
