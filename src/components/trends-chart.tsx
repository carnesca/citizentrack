"use client";

import { useEffect, useMemo, useState } from "react";
import {
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
import { TrendingUp } from "lucide-react";
import type { MonthlyTrend } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type TrendMode = "month" | "year";
type TrendView = "chart" | "table";
const TREND_START_YEAR = 2021;

type TrendPoint = {
  period_key: string;
  period_label: string;
  submissions: number;
  approvals: number;
  submissionsTrend?: number;
  approvalsTrend?: number;
};

export function TrendsChart({
  trends,
}: {
  trends: MonthlyTrend[];
}) {
  const [chartReady, setChartReady] = useState(false);
  const [mode, setMode] = useState<TrendMode>("year");
  const [view, setView] = useState<TrendView>("chart");
  const [showTrendLine, setShowTrendLine] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setChartReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const visibleTrends = useMemo(() => trends.filter((trend) => trend.year_number >= TREND_START_YEAR), [trends]);

  const baseChartData = useMemo<TrendPoint[]>(() => {
    if (mode === "month") {
      return visibleTrends.map((trend) => ({
        period_key: trend.period_key,
        period_label: trend.period_label,
        submissions: trend.submissions,
        approvals: trend.approvals,
      }));
    }

    const yearly = new Map<number, TrendPoint>();
    for (const trend of visibleTrends) {
      const existing = yearly.get(trend.year_number) ?? {
        period_key: String(trend.year_number),
        period_label: String(trend.year_number),
        submissions: 0,
        approvals: 0,
      };
      existing.submissions += trend.submissions;
      existing.approvals += trend.approvals;
      yearly.set(trend.year_number, existing);
    }

    return Array.from(yearly.values());
  }, [mode, visibleTrends]);

  const chartData = useMemo(() => {
    if (!showTrendLine) return baseChartData;

    const submissionTrend = linearTrend(baseChartData.map((point) => point.submissions));
    const approvalTrend = linearTrend(baseChartData.map((point) => point.approvals));

    return baseChartData.map((point, index) => ({
      ...point,
      submissionsTrend: submissionTrend[index],
      approvalsTrend: approvalTrend[index],
    }));
  }, [baseChartData, showTrendLine]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="gap-3 pb-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <TrendingUp className="h-5 w-5 text-primary" />
            Application Trends
          </CardTitle>
        </div>
        <div className="flex flex-wrap gap-2 sm:justify-end">
          <div className="flex w-fit rounded-md border border-border bg-secondary p-1">
            <Button
              type="button"
              size="sm"
              variant={view === "chart" ? "default" : "ghost"}
              className="h-7 px-3"
              onClick={() => setView("chart")}
            >
              Chart
            </Button>
            <Button
              type="button"
              size="sm"
              variant={view === "table" ? "default" : "ghost"}
              className="h-7 px-3"
              onClick={() => setView("table")}
            >
              Table
            </Button>
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
          {view === "chart" ? (
            <button
              type="button"
              role="switch"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border bg-secondary px-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              onClick={() => setShowTrendLine((current) => !current)}
              aria-checked={showTrendLine}
              aria-label={showTrendLine ? "Hide trend lines" : "Show trend lines"}
            >
              <span>Trend line</span>
              <span
                className={[
                  "relative inline-flex h-5 w-10 shrink-0 rounded-full border p-0.5 transition-colors",
                  showTrendLine ? "border-primary/60 bg-primary/40" : "border-border bg-background/70",
                ].join(" ")}
              >
                <span
                  className={[
                    "h-4 w-4 rounded-full bg-foreground shadow-sm transition-transform duration-200 ease-out",
                    showTrendLine ? "translate-x-5" : "translate-x-0",
                  ].join(" ")}
                />
              </span>
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent>
        {view === "chart" ? (
          <TrendsGraph chartReady={chartReady} chartData={chartData} mode={mode} showTrendLine={showTrendLine} />
        ) : (
          <TrendsTable data={baseChartData} />
        )}
      </CardContent>
    </Card>
  );
}

function TrendsGraph({
  chartReady,
  chartData,
  mode,
  showTrendLine,
}: {
  chartReady: boolean;
  chartData: TrendPoint[];
  mode: TrendMode;
  showTrendLine: boolean;
}) {
  return (
    <div className="h-[17rem] w-full min-w-0 sm:h-[300px]">
      {chartReady ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
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
              contentStyle={{
                backgroundColor: "var(--card)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                color: "var(--foreground)",
                boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
              }}
              labelStyle={{ color: "var(--foreground)" }}
            />
            <Legend wrapperStyle={{ paddingTop: "16px" }} iconType="circle" iconSize={8} />
            {mode === "year" ? (
              <>
                <Bar
                  dataKey="submissions"
                  name="Submissions"
                  fill="var(--chart-blue)"
                  radius={[4, 4, 0, 0]}
                  activeBar={{ stroke: "var(--foreground)", strokeOpacity: 0.2, strokeWidth: 1 }}
                />
                <Bar
                  dataKey="approvals"
                  name="Approvals"
                  fill="var(--chart-green)"
                  radius={[4, 4, 0, 0]}
                  activeBar={{ stroke: "var(--foreground)", strokeOpacity: 0.2, strokeWidth: 1 }}
                />
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="submissions"
                  name="Submissions"
                  stroke="var(--chart-blue)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="approvals"
                  name="Approvals"
                  stroke="var(--chart-green)"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, stroke: "var(--card)", strokeWidth: 2 }}
                  connectNulls
                />
              </>
            )}
            {showTrendLine ? (
              <>
                <Line
                  type="linear"
                  dataKey="submissionsTrend"
                  name="Submissions trend"
                  legendType="none"
                  stroke="var(--chart-blue)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
                <Line
                  type="linear"
                  dataKey="approvalsTrend"
                  name="Approvals trend"
                  legendType="none"
                  stroke="var(--chart-green)"
                  strokeWidth={2}
                  strokeDasharray="5 4"
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                  connectNulls
                />
              </>
            ) : null}
          </ComposedChart>
        </ResponsiveContainer>
      ) : (
        <div className="h-full rounded-lg border border-border bg-secondary" />
      )}
    </div>
  );
}

function TrendsTable({ data }: { data: TrendPoint[] }) {
  return (
    <div className="max-h-[300px] overflow-auto rounded-lg border border-border">
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-card">
          <TableRow className="hover:bg-transparent">
            <TableHead>Period</TableHead>
            <TableHead className="text-right">Submissions</TableHead>
            <TableHead className="text-right">Approvals</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right">Approval Rate</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length ? (
            data.map((point) => {
              const total = point.submissions + point.approvals;
              return (
                <TableRow key={point.period_key}>
                  <TableCell className="font-medium text-foreground">{point.period_label}</TableCell>
                  <TableCell className="text-right font-mono text-primary">{formatNumber(point.submissions)}</TableCell>
                  <TableCell className="text-right font-mono text-success">{formatNumber(point.approvals)}</TableCell>
                  <TableCell className="text-right font-mono text-foreground">{formatNumber(total)}</TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">{formatRate(point.approvals, total)}</TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                No trend data available.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function formatTick(value: string, mode: TrendMode) {
  if (mode === "year") return value;
  return value.startsWith("Jan ") ? value.slice(4) : value.split(" ")[0];
}

function linearTrend(values: number[]) {
  if (values.length < 2) return values;

  const n = values.length;
  const sumX = values.reduce((sum, _value, index) => sum + index, 0);
  const sumY = values.reduce((sum, value) => sum + value, 0);
  const sumXY = values.reduce((sum, value, index) => sum + index * value, 0);
  const sumXX = values.reduce((sum, _value, index) => sum + index * index, 0);
  const denominator = n * sumXX - sumX * sumX;

  if (denominator === 0) return values;

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return values.map((_value, index) => Math.max(0, Math.round((intercept + slope * index) * 10) / 10));
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatRate(approvals: number, total: number) {
  if (!total) return "n/a";
  return `${((approvals / total) * 100).toLocaleString("en-US", { maximumFractionDigits: 1 })}%`;
}
