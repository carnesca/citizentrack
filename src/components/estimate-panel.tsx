"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Sparkles } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import type { CitizenshipApplication } from "@/lib/types";

type Prediction = {
  predicted_next_milestone: string;
  date_range_start: string | null;
  date_range_end: string | null;
  confidence: "low" | "medium" | "high";
  similar_cases_count: number;
  basis: string;
  caveats: string;
};

export function EstimatePanel({ initialApplicationId }: { initialApplicationId?: string }) {
  const [applications, setApplications] = useState<CitizenshipApplication[]>([]);
  const [applicationId, setApplicationId] = useState(initialApplicationId ?? "");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient()
      .from("citizenship_applications")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        const apps = (data ?? []) as CitizenshipApplication[];
        setApplications(apps);
        if (!applicationId && apps[0]) setApplicationId(apps[0].id);
      });
  }, [applicationId]);

  async function generate() {
    setLoading(true);
    setError(null);
    setPrediction(null);
    const response = await fetch("/api/ai/timeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ application_id: applicationId }),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "Could not generate estimate.");
      return;
    }
    setPrediction(result);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Your Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-muted">Application</span>
          <Select value={applicationId} onChange={(event) => setApplicationId(event.target.value)}>
            {applications.map((application) => (
              <option key={application.id} value={application.id}>
                {application.law_type_id.replaceAll("_", " ")} - submitted {application.submitted_on ?? "unknown"}
              </option>
            ))}
          </Select>
        </label>
        <Button onClick={generate} disabled={!applicationId || loading}>
          {loading ? "Generating..." : "Generate estimate"}
        </Button>
        {error ? <Alert className="border-danger/30 text-danger">{error}</Alert> : null}
        {prediction ? (
          <div className="rounded-lg border border-border bg-surface-elevated p-5">
            <EstimateWindow
              milestone={toTitleCase(prediction.predicted_next_milestone)}
              start={prediction.date_range_start}
              end={prediction.date_range_end}
              confidence={prediction.confidence}
              comparableCases={prediction.similar_cases_count}
            />
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function EstimateWindow({
  milestone,
  start,
  end,
  confidence,
  comparableCases,
}: {
  milestone: string;
  start: string | null;
  end: string | null;
  confidence: Prediction["confidence"];
  comparableCases: number;
}) {
  const range = getWindowRange(start, end);
  const title = getForecastTitle(milestone);
  const description = getForecastDescription(milestone);

  if (!range) {
    return (
      <div>
        <div>
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <CalendarDays className="h-4 w-4 text-primary" />
            {title}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">There is not enough date information to visualize this forecast yet.</p>
        </div>
        <ForecastFacts confidence={confidence} windowLabel="Not Available" comparableCases={comparableCases} />
        <EstimateDisclaimer />
      </div>
    );
  }

  return (
    <div>
      <div>
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <CalendarDays className="h-4 w-4 text-primary" />
          {title}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>

      <ForecastFacts confidence={confidence} windowLabel={range.monthsLabel} comparableCases={comparableCases} />

      <div className="mt-6">
        <div className="relative h-4 rounded-full bg-secondary">
          <div className="absolute left-0 top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-card bg-muted" />
          <div
            className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-[linear-gradient(90deg,var(--primary),var(--success))] shadow-[0_10px_30px_color-mix(in_srgb,var(--primary)_25%,transparent)]"
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

        <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
          <div>
            <p className="font-medium text-foreground">Today</p>
            <p className="text-muted-foreground">{formatShortDate(new Date())}</p>
          </div>
          <div className="text-center">
            <p className="font-medium text-foreground">Earliest</p>
            <p className="text-muted-foreground">{formatShortDate(range.startDate)}</p>
          </div>
          <div className="text-right">
            <p className="font-medium text-foreground">Latest</p>
            <p className="text-muted-foreground">{formatShortDate(range.endDate)}</p>
          </div>
        </div>
      </div>
      <EstimateDisclaimer />
    </div>
  );
}

function ForecastFacts({
  confidence,
  windowLabel,
  comparableCases,
}: {
  confidence: Prediction["confidence"];
  windowLabel: string;
  comparableCases: number;
}) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      <ForecastFact label="Confidence" value={toTitleCase(confidence)} valueClassName={getConfidenceTextClass(confidence)} />
      <ForecastFact label="Window" value={windowLabel} valueClassName="text-primary" />
      <ForecastFact label="Comparable Cases" value={formatCount(comparableCases)} valueClassName="text-foreground" />
    </div>
  );
}

function EstimateDisclaimer() {
  return (
    <p className="mt-5 text-xs leading-5 text-muted-foreground">
      This is an estimate based on historical application timelines and is not legal advice or an official decision.
    </p>
  );
}

function ForecastFact({ label, value, valueClassName }: { label: string; value: string; valueClassName: string }) {
  return (
    <div className="rounded-md bg-secondary/55 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
      <p className={`mt-1 font-mono text-base font-semibold ${valueClassName}`}>{value}</p>
    </div>
  );
}

function getForecastTitle(milestone: string) {
  const normalized = milestone.toLowerCase();
  if (normalized.includes("file number")) return "File Number Forecast";
  if (normalized.includes("certificate")) return "Estimated Window";
  if (normalized.includes("completed")) return "Completed Timeline";
  return `${milestone} Forecast`;
}

function getForecastDescription(milestone: string) {
  const normalized = milestone.toLowerCase();
  if (normalized.includes("file number")) return "Likely range for when your file number may be received.";
  if (normalized.includes("certificate")) return "Likely range for when your citizenship certificate may be received.";
  if (normalized.includes("completed")) return "This application already has a completed certificate date.";
  return `Likely range for your ${milestone.toLowerCase()}.`;
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
  const startDate = startOfDay(new Date(start));
  const endDate = startOfDay(new Date(end));

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return null;

  const totalDays = Math.max(1, daysBetween(today, endDate));
  const daysToStart = Math.max(0, daysBetween(today, startDate));
  const daysToEnd = Math.max(daysToStart + 1, daysBetween(today, endDate));
  const startPercent = Math.max(8, Math.min(88, Math.round((daysToStart / totalDays) * 100)));
  const endPercent = Math.max(startPercent + 8, Math.min(96, Math.round((daysToEnd / totalDays) * 100)));
  const widthPercent = Math.max(8, endPercent - startPercent);
  const monthsToStart = Math.max(0, Math.round(daysToStart / 30.4375));
  const monthsToEnd = Math.max(monthsToStart, Math.round(daysToEnd / 30.4375));

  return {
    startDate,
    endDate,
    startPercent,
    endPercent,
    widthPercent,
    monthsLabel: `${monthsToStart}-${monthsToEnd} mo`,
  };
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

function getConfidenceTextClass(confidence: Prediction["confidence"]) {
  if (confidence === "high") return "text-success";
  if (confidence === "medium") return "text-warning";
  return "text-danger";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}
