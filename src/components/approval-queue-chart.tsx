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

const QUEUE_CHART_START_YEAR = 2021;

export function ApprovalQueueChart({
  stats,
  laws,
}: {
  stats: ApprovalQueueStats | null;
  laws: LawTypeStat[];
}) {
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
  const queueEstimateData = useMemo(
    () => getAllCohortPoints(stats?.cohorts ?? [], selectedLawType).filter((point) => point.approved_count > 0),
    [stats?.cohorts, selectedLawType],
  );
  const queuePosition = useMemo(() => getQueuePosition(queueEstimateData), [queueEstimateData]);
  const approvedCases = useMemo(
    () => queueEstimateData.reduce((total, point) => total + point.approved_count, 0),
    [queueEstimateData],
  );
  const selectedLawName =
    lawOptions.find((law) => law.law_type_id === selectedLawType)?.display_name ?? "All application types";
  const queueBasis =
    "Estimates submitted month/year cohorts showing approval activity, not your individual place in line. Based on all approved cases with submission and certificate dates; chart display starts at 2021.";

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-4 pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <CheckCheck className="h-5 w-5 text-success" />
              Estimated Active Submission Cohort
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Estimates which submitted month/year cohorts are showing BVA approval activity, based on approved cases grouped by original submission date.
            </p>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:min-w-[18rem] sm:flex-row sm:items-center">
            <Select
              value={selectedLawType}
              onChange={(event) => setSelectedLawType(event.target.value)}
              aria-label="Filter active submission cohort estimate by application type"
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
          <QueueMetric
            label="Estimated Active Submission Cohort"
            value={queuePosition}
            detail={queueBasis}
          />
          <QueueMetric
            label="Approvals Included"
            value={formatNumber(approvedCases)}
            detail={selectedLawName}
          />
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
                    if (name === "Approvals") return [formatNumber(Number(value)), name];
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
                  name="Approvals"
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
    return fillMonthlyTimeline(getAllCohortPoints(cohorts, lawTypeId));
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

  return fillYearlyTimeline(Array.from(yearly.values()).sort((a, b) => a.period_key.localeCompare(b.period_key)));
}

function getAllCohortPoints(cohorts: ApprovalQueueCohort[], lawTypeId: string) {
  return cohorts
    .map((cohort) => ({
      period_key: cohort.period_key,
      period_label: cohort.period_label,
      approved_count: getApprovedCount(cohort, lawTypeId),
    }))
    .sort((a, b) => a.period_key.localeCompare(b.period_key));
}

function fillMonthlyTimeline(points: QueuePoint[]) {
  if (!points.length) return [];

  const byKey = new Map(points.map((point) => [point.period_key, point]));
  const startIndex = QUEUE_CHART_START_YEAR * 12;
  const lastPointIndex = Math.max(...points.map((point) => monthIndex(point.period_key) ?? startIndex));
  const endIndex = Math.max(startIndex, lastPointIndex);
  const filled: QueuePoint[] = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const key = monthKeyFromIndex(index);
    filled.push(
      byKey.get(key) ?? {
        period_key: key,
        period_label: formatMonthLabel(key),
        approved_count: 0,
      },
    );
  }

  return filled;
}

function fillYearlyTimeline(points: QueuePoint[]) {
  if (!points.length) return [];

  const byKey = new Map(points.map((point) => [point.period_key, point]));
  const maxYear = Math.max(...points.map((point) => Number(point.period_key)).filter(Number.isFinite));
  const filled: QueuePoint[] = [];

  for (let year = QUEUE_CHART_START_YEAR; year <= maxYear; year += 1) {
    const key = String(year);
    filled.push(
      byKey.get(key) ?? {
        period_key: key,
        period_label: key,
        approved_count: 0,
      },
    );
  }

  return filled;
}

function getApprovedCount(cohort: ApprovalQueueCohort, lawTypeId: string) {
  if (!lawTypeId) return cohort.approved_count;
  return cohort.law_type_breakdown?.find((law) => law.law_type_id === lawTypeId)?.approved_count ?? 0;
}

function getQueuePosition(points: QueuePoint[]) {
  if (!points.length) return "n/a";

  const totalApprovals = points.reduce((sum, point) => sum + point.approved_count, 0);
  const majorityTarget = Math.floor(totalApprovals / 2) + 1;
  const dominantWindow = getDominantApprovalWindow(points, majorityTarget);

  return dominantWindow?.end.period_label ?? points[points.length - 1].period_label;
}

function getDominantApprovalWindow(points: QueuePoint[], targetApprovals: number) {
  let best:
    | {
        start: QueuePoint;
        end: QueuePoint;
        span: number;
        approvals: number;
      }
    | null = null;

  for (let startIndex = 0; startIndex < points.length; startIndex += 1) {
    let approvals = 0;

    for (let endIndex = startIndex; endIndex < points.length; endIndex += 1) {
      approvals += points[endIndex].approved_count;
      if (approvals < targetApprovals) continue;

      const span = monthSpan(points[startIndex].period_key, points[endIndex].period_key);
      const candidate = {
        start: points[startIndex],
        end: points[endIndex],
        span: span ?? Number.MAX_SAFE_INTEGER,
        approvals,
      };

      if (
        !best ||
        candidate.span < best.span ||
        (candidate.span === best.span && candidate.approvals > best.approvals) ||
        (candidate.span === best.span &&
          candidate.approvals === best.approvals &&
          candidate.end.period_key > best.end.period_key)
      ) {
        best = candidate;
      }

      break;
    }
  }

  return best;
}

function monthSpan(startKey: string, endKey: string) {
  const start = monthIndex(startKey);
  const end = monthIndex(endKey);
  if (start === null || end === null) return null;
  return end - start;
}

function monthIndex(key: string) {
  const [yearRaw, monthRaw] = key.split("-");
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month)) return null;
  return year * 12 + month - 1;
}

function monthKeyFromIndex(index: number) {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthLabel(key: string) {
  const date = new Date(`${key}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return key;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatTick(value: string, mode: QueueMode) {
  if (mode === "year") return value;
  return value;
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}
