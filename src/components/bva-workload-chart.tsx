"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import {
  bvaStag5MonthlyStats,
  getBvaStag5QueueReachEstimate,
  getBvaStag5WorkloadSummary,
} from "@/lib/bva-stats";

type BvaChartMode = "backlog" | "flow" | "outcomes";

export function BvaWorkloadChart() {
  const [chartReady, setChartReady] = useState(false);
  const [mode, setMode] = useState<BvaChartMode>("backlog");
  const [selectedCohort, setSelectedCohort] = useState("2024-05");
  const summary = useMemo(() => getBvaStag5WorkloadSummary(), []);
  const queueReach = useMemo(() => getBvaStag5QueueReachEstimate(selectedCohort), [selectedCohort]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-4 pb-3">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Building2 className="h-5 w-5 text-primary" />
              Official BVA StAG 5 Stats from August 2026
            </CardTitle>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Official monthly BVA statistics show StAG 5 applications received, processed, approved, rejected, and in backlog. This is separate from community milestone timelines because it does not include applicant-level dates.
            </p>
          </div>
          <div className="flex w-fit rounded-md border border-border bg-secondary p-1">
            <Button type="button" size="sm" variant={mode === "backlog" ? "default" : "ghost"} className="h-7 px-3" onClick={() => setMode("backlog")}>
              Backlog
            </Button>
            <Button type="button" size="sm" variant={mode === "flow" ? "default" : "ghost"} className="h-7 px-3" onClick={() => setMode("flow")}>
              Intake
            </Button>
            <Button type="button" size="sm" variant={mode === "outcomes" ? "default" : "ghost"} className="h-7 px-3" onClick={() => setMode("outcomes")}>
              Outcomes
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <BvaMetric label="Latest backlog" value={formatNumber(summary.latestBacklog)} detail={summary.latestPeriodLabel} />
          <BvaMetric label="Recent monthly processed" value={formatNumber(summary.recentAverageMonthlyProcessed)} detail="12-month average" />
          <BvaMetric label="Recent monthly received" value={formatNumber(summary.recentAverageMonthlyReceived)} detail="12-month average" />
          <BvaMetric
            label="Backlog at recent pace"
            value={summary.estimatedBacklogMonthsAtRecentPace == null ? "n/a" : `${formatNumber(summary.estimatedBacklogMonthsAtRecentPace)} mo`}
            detail="Context, not a personal estimate"
          />
        </div>

        <div className="h-[18rem] w-full min-w-0 sm:h-[320px]">
          {chartReady ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <ComposedChart data={bvaStag5MonthlyStats} margin={{ top: 8, right: 12, left: -4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="monthLabel"
                  interval="preserveStartEnd"
                  minTickGap={24}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={{ stroke: "var(--border)" }}
                  tickLine={false}
                  tickFormatter={(value) => formatMonthTick(String(value))}
                />
                <YAxis
                  width={46}
                  allowDecimals={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => compactNumber(Number(value))}
                />
                <Tooltip
                  cursor={{
                    fill: "var(--accent)",
                    fillOpacity: 0.42,
                    radius: 6,
                    stroke: "var(--primary)",
                    strokeOpacity: 0.16,
                    strokeWidth: 1,
                  }}
                  formatter={(value, name) => [formatNumber(Number(value)), labelForSeries(String(name))]}
                  contentStyle={{
                    backgroundColor: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    color: "var(--foreground)",
                    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
                  }}
                  labelStyle={{ color: "var(--foreground)" }}
                />
                <Legend wrapperStyle={{ paddingTop: "16px" }} iconType="circle" iconSize={8} formatter={(value) => labelForSeries(String(value))} />
                {mode === "backlog" ? (
                  <>
                    <Area
                      type="monotone"
                      dataKey="backlog"
                      name="backlog"
                      stroke="var(--primary)"
                      fill="var(--primary)"
                      fillOpacity={0.16}
                      strokeWidth={3}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="processed"
                      name="processed"
                      stroke="var(--success)"
                      strokeWidth={2}
                      dot={false}
                      yAxisId={0}
                    />
                  </>
                ) : null}
                {mode === "flow" ? (
                  <>
                    <Bar dataKey="applicationsReceived" name="applicationsReceived" fill="var(--chart-blue)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="processed" name="processed" fill="var(--warning)" radius={[4, 4, 0, 0]} />
                  </>
                ) : null}
                {mode === "outcomes" ? (
                  <>
                    <Bar dataKey="approved" name="approved" fill="var(--success)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="rejected" name="rejected" fill="var(--destructive)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="otherwiseCompleted" name="otherwiseCompleted" fill="var(--muted)" radius={[4, 4, 0, 0]} />
                  </>
                ) : null}
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full rounded-lg border border-border bg-secondary" />
          )}
        </div>

        <div className="rounded-lg border border-primary/15 bg-primary/5 px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
            <div>
              <p className="text-sm font-semibold text-foreground">Where BVA may be in the StAG 5 queue</p>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                This rough model compares how many StAG 5 applications BVA received with how many cases it processed. It assumes older applications are generally handled first, then estimates which submission month BVA may be reaching.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-muted-foreground">If you submitted in</span>
              <Select value={selectedCohort} onChange={(event) => setSelectedCohort(event.target.value)}>
                {bvaStag5MonthlyStats.map((row) => (
                  <option key={row.periodKey} value={row.periodKey}>
                    {row.monthLabel}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <BvaMetric
              label="BVA may be reaching"
              value={queueReach.currentReach.monthLabel}
              detail={`Based on data through ${queueReach.latestPeriodLabel}`}
            />
            <BvaMetric
              label="Your month may start around"
              value={queueReach.targetStartReachRangeLabel}
              detail="Earlier if processing keeps improving; later if current pace stays flat"
            />
            <BvaMetric
              label="Your month may be mostly processed by"
              value={queueReach.targetFullyReachedRangeLabel}
              detail={`${formatNumber(queueReach.remainingThroughTarget)} estimated older or same-month cases remain`}
            />
          </div>

          <div className="mt-3 grid gap-2 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
            <p>
              <span className="font-medium text-foreground">Current pace:</span> uses the recent 12-month average of{" "}
              {formatNumber(queueReach.recentAverageMonthlyProcessed)} processed cases per month.
            </p>
            <p>
              <span className="font-medium text-foreground">Improving pace:</span> assumes processing continues increasing gradually, capped at{" "}
              {formatNumber(Math.round(queueReach.projectedMonthlyProcessingGrowth))} additional cases per month.
            </p>
          </div>

          <QueueReachBar
            currentPeriodKey={queueReach.currentReach.periodKey}
            targetPeriodKey={queueReach.target.periodKey}
          />

          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            This is a queue-position estimate, not a personal approval prediction. Missing documents, case complexity, and office handling can cause later submissions to be approved before earlier ones.
          </p>
        </div>

        <p className="text-xs leading-5 text-muted-foreground">
          Source: Federal Office of Administration StAG 5 monthly statistics released through FragDenStaat. These totals describe BVA workload and backlog; community charts above remain based on individual application milestone dates.
        </p>
      </CardContent>
    </Card>
  );
}

function QueueReachBar({
  currentPeriodKey,
  targetPeriodKey,
}: {
  currentPeriodKey: string;
  targetPeriodKey: string;
}) {
  const startKey = bvaStag5MonthlyStats[0].periodKey;
  const endKey = bvaStag5MonthlyStats[bvaStag5MonthlyStats.length - 1].periodKey;
  const currentPercent = periodPercent(currentPeriodKey, startKey, endKey);
  const targetPercent = periodPercent(targetPeriodKey, startKey, endKey);

  return (
    <div className="mt-5" aria-label="Estimated BVA queue position visualization">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <p className="font-medium text-foreground">Data starts</p>
          <p className="text-muted-foreground">{formatPeriodKey(startKey)}</p>
        </div>
        <div className="text-center">
          <p className="font-medium text-foreground">BVA may be here</p>
          <p className="text-muted-foreground">{formatPeriodKey(currentPeriodKey)}</p>
        </div>
        <div className="text-right">
          <p className="font-medium text-foreground">Your selected month</p>
          <p className="text-muted-foreground">{formatPeriodKey(targetPeriodKey)}</p>
        </div>
      </div>
      <div className="relative mt-3 h-4 rounded-full bg-secondary">
        <div
          className="absolute left-0 top-1/2 h-4 -translate-y-1/2 rounded-full bg-primary/25"
          style={{ width: `${currentPercent}%` }}
        />
        <div
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-primary shadow-md"
          style={{ left: `${currentPercent}%` }}
        />
        <div
          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-card bg-warning shadow-md"
          style={{ left: `${targetPercent}%` }}
        />
      </div>
    </div>
  );
}

function BvaMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-border bg-secondary px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

function labelForSeries(value: string) {
  if (value === "applicationsReceived") return "Applications received";
  if (value === "processed") return "Processed";
  if (value === "approved") return "Approved";
  if (value === "rejected") return "Rejected";
  if (value === "otherwiseCompleted") return "Other completions";
  if (value === "backlog") return "Backlog";
  return value;
}

function formatMonthTick(value: string) {
  return value.startsWith("Jan ") ? value.slice(4) : value.split(" ")[0];
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function compactNumber(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function periodPercent(periodKey: string, startKey: string, endKey: string) {
  const start = periodIndex(startKey);
  const end = periodIndex(endKey);
  const current = periodIndex(periodKey);
  if (end <= start) return 0;
  return Math.max(0, Math.min(100, Math.round(((current - start) / (end - start)) * 100)));
}

function periodIndex(periodKey: string) {
  const [yearRaw, monthRaw] = periodKey.split("-");
  return Number(yearRaw) * 12 + Number(monthRaw) - 1;
}

function formatPeriodKey(periodKey: string) {
  const row = bvaStag5MonthlyStats.find((item) => item.periodKey === periodKey);
  if (row) return row.monthLabel;
  const [yearRaw, monthRaw] = periodKey.split("-");
  return new Date(Number(yearRaw), Number(monthRaw) - 1, 1).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}
