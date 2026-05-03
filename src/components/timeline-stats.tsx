"use client";

import { useMemo, useState } from "react";
import { Clock } from "lucide-react";
import type { LawTypeStat } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { formatMonths, formatNumber } from "@/lib/utils";

export function TimelineStats({ laws }: { laws: LawTypeStat[] }) {
  const [selectedLawId, setSelectedLawId] = useState("");

  const selectedLaw = laws.find((law) => law.law_type_id === selectedLawId) ?? null;
  const overallAverage = useMemo(() => weightedAverage(laws), [laws]);

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <div className="space-y-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Clock className="h-5 w-5 text-primary" />
            Processing Times by Application Type
          </CardTitle>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_16rem] sm:items-end">
            <div>
              <p className="text-sm text-muted-foreground">Overall average typical time from submission to certificate</p>
              <p className="mt-1 font-mono text-3xl font-semibold text-foreground">{formatMonths(overallAverage)}</p>
            </div>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-muted-foreground">Show details for</span>
              <Select value={selectedLawId} onChange={(event) => setSelectedLawId(event.target.value)}>
                <option value="">Select application type</option>
                {laws.map((law) => (
                  <option key={law.law_type_id} value={law.law_type_id}>
                    {law.display_name}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {selectedLaw ? (
          <LawTimeline law={selectedLaw} />
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-secondary/40 p-5 text-sm leading-6 text-muted-foreground">
            Select an application type to view the average time to file number, average time from file number to certificate, pending wait range, and case counts.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LawTimeline({ law }: { law: LawTypeStat }) {
  const totalMonths = law.avg_total_submission_to_certificate_months;
  const azMonths = law.avg_submission_to_az_months;
  const certificateMonths = law.avg_az_to_certificate_months;
  const azPercent = segmentPercent(azMonths, totalMonths);
  const certificatePercent = segmentPercent(certificateMonths, totalMonths);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground">{law.display_name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">Typical completed-case path from submission to citizenship certificate.</p>
        </div>
        <div className="flex items-baseline gap-2 sm:shrink-0">
          <span className="text-xs text-muted-foreground">typical total</span>
          <span className="font-mono text-2xl font-bold text-foreground">{formatMonths(totalMonths)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[0.68rem] uppercase tracking-wide text-muted-foreground">
          <span>Submitted</span>
          <span>File number</span>
          <span>Certificate</span>
        </div>
        <div className="flex h-3 overflow-hidden rounded-full bg-secondary" aria-label={`${law.display_name} average completed case timeline`}>
          <div className="bg-chart-blue" style={{ width: `${azPercent}%` }} />
          <div className="bg-chart-green" style={{ width: `${certificatePercent}%` }} />
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full bg-chart-blue" />
            submission to file number
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-5 rounded-full bg-chart-green" />
            file number to certificate
          </span>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-primary/20 bg-primary/10 px-3 py-3">
          <p className="text-muted-foreground">Submission to file number</p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{formatMonths(azMonths)}</p>
        </div>
        <div className="rounded-md border border-success/20 bg-success/10 px-3 py-3">
          <p className="text-muted-foreground">File number to certificate</p>
          <p className="mt-1 font-mono text-lg font-semibold text-foreground">{formatMonths(certificateMonths)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <span>
          Pending cases have waited {formatMonths(law.avg_waiting_since_submission_months)} on average since submission
          <span className="hidden sm:inline"> </span>
          <span className="sm:whitespace-nowrap">({formatMonths(law.min_waiting_since_submission_months)} to {formatMonths(law.max_waiting_since_submission_months)} range)</span>
        </span>
        <Badge variant="outline" className="w-fit border-border text-muted-foreground">
          {formatNumber(law.total)} cases · {formatNumber(law.pending)} pending
        </Badge>
      </div>
    </div>
  );
}

function segmentPercent(value: number | null, total: number | null) {
  if (!value || !total) return 0;
  return Math.max(4, Math.min(100, Math.round((value / total) * 100)));
}

function weightedAverage(laws: LawTypeStat[]) {
  const values = laws
    .map((law) => ({
      value: law.avg_total_submission_to_certificate_months,
      weight: Math.max(0, law.approved || law.total || 0),
    }))
    .filter((entry): entry is { value: number; weight: number } => entry.value !== null && entry.weight > 0);

  const weight = values.reduce((sum, entry) => sum + entry.weight, 0);
  if (!weight) return null;

  return Math.round((values.reduce((sum, entry) => sum + entry.value * entry.weight, 0) / weight) * 10) / 10;
}
