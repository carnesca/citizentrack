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
import type { ApprovalQueueCohort, ApprovalQueueStats } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type QueueMode = "year" | "month";

type QueuePoint = {
  period_key: string;
  period_label: string;
  approved_count: number;
  avg_submission_to_certificate_months: number | null;
  latest_certificate_received_on: string | null;
};

export function ApprovalQueueChart({ stats }: { stats: ApprovalQueueStats | null }) {
  const [chartReady, setChartReady] = useState(false);
  const [mode, setMode] = useState<QueueMode>("year");

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const chartData = useMemo(() => aggregateCohorts(stats?.cohorts ?? [], mode), [stats?.cohorts, mode]);
  const activeWindow = useMemo(() => getActiveWindow(chartData), [chartData]);
  const newestCohort = stats?.newest_approved_submission_period_label ?? "n/a";
  const medianWait = formatMonths(stats?.median_submission_to_certificate_months ?? null);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-3 pb-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <CheckCheck className="h-5 w-5 text-success" />
            Approval Queue Position
          </CardTitle>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Approved cases grouped by when the application was originally submitted.
          </p>
        </div>
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
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <QueueMetric label="Newest Approved Cohort" value={newestCohort} />
          <QueueMetric label="Active Approval Range" value={activeWindow} />
          <QueueMetric label="Median Time to Certificate" value={medianWait} />
        </div>

        <div className="h-[18rem] w-full min-w-0 sm:h-[320px]">
          {chartReady ? (
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
                    if (name === "Approved cases") return [formatNumber(Number(value)), name];
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
                  name="Approved cases"
                  fill="var(--success)"
                  radius={[5, 5, 0, 0]}
                  activeBar={{ stroke: "var(--foreground)", strokeOpacity: 0.22, strokeWidth: 1 }}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg border border-border bg-secondary" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function QueueMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function aggregateCohorts(cohorts: ApprovalQueueCohort[], mode: QueueMode): QueuePoint[] {
  if (mode === "month") {
    return cohorts.map((cohort) => ({
      period_key: cohort.period_key,
      period_label: cohort.period_label,
      approved_count: cohort.approved_count,
      avg_submission_to_certificate_months: cohort.avg_submission_to_certificate_months,
      latest_certificate_received_on: cohort.latest_certificate_received_on,
    }));
  }

  const yearly = new Map<number, { totalWait: number; weightedCount: number; point: QueuePoint }>();

  for (const cohort of cohorts) {
    const existing = yearly.get(cohort.year_number) ?? {
      totalWait: 0,
      weightedCount: 0,
      point: {
        period_key: String(cohort.year_number),
        period_label: String(cohort.year_number),
        approved_count: 0,
        avg_submission_to_certificate_months: null,
        latest_certificate_received_on: null,
      },
    };

    existing.point.approved_count += cohort.approved_count;
    if (cohort.avg_submission_to_certificate_months !== null) {
      existing.totalWait += cohort.avg_submission_to_certificate_months * cohort.approved_count;
      existing.weightedCount += cohort.approved_count;
    }
    if (
      cohort.latest_certificate_received_on &&
      (!existing.point.latest_certificate_received_on ||
        cohort.latest_certificate_received_on > existing.point.latest_certificate_received_on)
    ) {
      existing.point.latest_certificate_received_on = cohort.latest_certificate_received_on;
    }
    yearly.set(cohort.year_number, existing);
  }

  return Array.from(yearly.values()).map(({ point, totalWait, weightedCount }) => ({
    ...point,
    avg_submission_to_certificate_months: weightedCount ? Math.round((totalWait / weightedCount) * 10) / 10 : null,
  }));
}

function getActiveWindow(points: QueuePoint[]) {
  const active = points.filter((point) => point.approved_count > 0);
  if (!active.length) return "n/a";
  return `${active[0].period_label} - ${active[active.length - 1].period_label}`;
}

function formatTick(value: string, mode: QueueMode) {
  if (mode === "year") return value;
  return value.startsWith("Jan ") ? value.slice(4) : value.split(" ")[0];
}

function formatMonths(value: number | null) {
  if (value === null) return "n/a";
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} mo`;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}
