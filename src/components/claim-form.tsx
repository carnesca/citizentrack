"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, UserRoundSearch } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { lawTypeLabel } from "@/lib/utils";

const countries = [
  "Afghanistan",
  "Argentina",
  "Australia",
  "Belgium",
  "Bolivia",
  "Brazil",
  "Canada",
  "Chile",
  "China",
  "Colombia",
  "Costa Rica",
  "Cuba",
  "Czech Republic",
  "Egypt",
  "France",
  "Germany",
  "Guatemala",
  "Ireland",
  "Israel",
  "Italy",
  "Jordan",
  "Kuwait",
  "Mexico",
  "Namibia",
  "Netherlands",
  "New Zealand",
  "Nigeria",
  "Norway",
  "Peru",
  "Poland",
  "Portugal",
  "South Africa",
  "South Korea",
  "Sweden",
  "Switzerland",
  "Tunisia",
  "Turkey",
  "United Kingdom",
  "United States",
  "USA",
  "Venezuela",
];

const applicationMethods = [
  { label: "Mail", value: "Mail" },
  { label: "Online", value: "Online" },
  { label: "Direct to BVA", value: "Mail - Direct to BVA" },
];

const lawTypeLabels: Record<string, string> = {
  "5_stag_erklarung": "StAG 5",
  feststellung: "Feststellung",
  artikel_116: "Artikel 116",
  stag_10: "StAG 10",
  stag_14: "StAG 14",
  stag_15: "StAG 15",
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  aktenzeichen_received: "File number received",
  certificate_received: "Certificate received",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  unknown: "Unknown",
};

type ClaimMode = "identifier" | "blank_identity";

type ClaimFormState = {
  claim_mode: ClaimMode;
  identifier: string;
  law_type_id: string;
  submission_country: string;
  handling_office: string;
  application_method: string;
  submitted_on: string;
  aktenzeichen_on: string;
  certificate_received_on: string;
  aktenzeichen_not_received: boolean;
  certificate_not_received: boolean;
};

type ClaimMatchSummary = {
  law_type?: string | null;
  law_type_id?: string | null;
  source_row_number?: number | null;
  submitted_on?: string | null;
  submission_country?: string | null;
  handling_office?: string | null;
  application_method?: string | null;
  aktenzeichen_on?: string | null;
  file_number_received_on?: string | null;
  certificate_received_on?: string | null;
  status?: string | null;
};

type ClaimPreview = {
  status: "ready_to_confirm" | "refine" | "no_match" | "already_claimed";
  can_confirm: boolean;
  match_count: number;
  match?: ClaimMatchSummary | null;
  possible_matches?: ClaimMatchSummary[];
  possible_match_limit?: number;
  message?: string;
};

export function ClaimForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClaimPreview | null>(null);
  const [form, setForm] = useState<ClaimFormState>({
    claim_mode: "identifier",
    identifier: "",
    law_type_id: "5_stag_erklarung",
    submission_country: "",
    handling_office: "",
    application_method: "",
    submitted_on: "",
    aktenzeichen_on: "",
    certificate_received_on: "",
    aktenzeichen_not_received: true,
    certificate_not_received: true,
  });

  function updateForm(patch: Partial<ClaimFormState>) {
    setForm((current) => ({ ...current, ...patch }));
    setPreview(null);
    setMessage(null);
    setError(null);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const action = preview?.can_confirm ? "confirm" : "preview";
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/claims/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, action }),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "No exact match found.");
      return;
    }

    if (action === "preview") {
      setPreview(result as ClaimPreview);
      return;
    }

    const applicationId = (result as { application_id?: string }).application_id;
    let timelineWarning: string | null = null;
    if (applicationId) {
      const estimateError = await refreshTimelineEstimate(applicationId);
      if (estimateError) {
        timelineWarning = ` The timeline estimate will refresh after your next application update.`;
      }
    }

    setMessage(`Historical row copied into your private account.${timelineWarning ?? ""}`);
    setTimeout(() => router.push("/app"), 700);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRoundSearch className="h-5 w-5 text-primary" />
          Claim case
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={submit}>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={[
                "rounded-lg border p-4 text-left transition-colors",
                form.claim_mode === "identifier"
                  ? "border-primary bg-accent text-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:bg-accent",
              ].join(" ")}
              onClick={() => updateForm({ claim_mode: "identifier" })}
            >
              <span className="block text-sm font-semibold">I have a spreadsheet name, username or ID</span>
              <span className="mt-1 block text-sm leading-5">Fastest option. Enter the value from your legacy spreadsheet row.</span>
            </button>
            <button
              type="button"
              className={[
                "rounded-lg border p-4 text-left transition-colors",
                form.claim_mode === "blank_identity"
                  ? "border-primary bg-accent text-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:bg-accent",
              ].join(" ")}
              onClick={() => updateForm({ claim_mode: "blank_identity" })}
            >
              <span className="block text-sm font-semibold">My spreadsheet row had no name, username, or ID</span>
              <span className="mt-1 block text-sm leading-5">Use case details only when the identifying cell was blank.</span>
            </button>
          </div>

          {form.claim_mode === "identifier" ? (
            <div className="grid gap-5">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Spreadsheet name, username, or ID</span>
                <Input
                  value={form.identifier}
                  onChange={(event) => updateForm({ identifier: event.target.value })}
                  placeholder="u/username, display name, or row ID"
                  required
                />
              </label>
              <Alert>
                Use the value exactly as it appeared in the legacy spreadsheet if you can. Reddit forms like
                <span className="font-mono"> u/example</span>, names, and spreadsheet row IDs are supported.
              </Alert>
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              <Alert className="lg:col-span-2">
                Only use this option if the spreadsheet row had a blank name/username/ID cell. Add enough details to make exactly one match.
              </Alert>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Law type</span>
                <Select value={form.law_type_id} onChange={(event) => updateForm({ law_type_id: event.target.value })}>
                  <option value="5_stag_erklarung">StAG 5</option>
                  <option value="feststellung">Feststellung</option>
                  <option value="artikel_116">Artikel 116</option>
                  <option value="stag_10">StAG 10</option>
                  <option value="stag_14">StAG 14</option>
                  <option value="stag_15">StAG 15</option>
                </Select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Country</span>
                <Select
                  value={form.submission_country}
                  onChange={(event) => updateForm({ submission_country: event.target.value })}
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Handling office</span>
                <Input value={form.handling_office} onChange={(event) => updateForm({ handling_office: event.target.value })} placeholder="BVA, consulate, city office" />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Application method</span>
                <Select value={form.application_method} onChange={(event) => updateForm({ application_method: event.target.value })}>
                  <option value="">Select method</option>
                  {applicationMethods.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Submitted on</span>
                <Input type="date" value={form.submitted_on} onChange={(event) => updateForm({ submitted_on: event.target.value })} required />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">File number date, if present</span>
                <Input
                  type="date"
                  value={form.aktenzeichen_on}
                  onChange={(event) => updateForm({ aktenzeichen_on: event.target.value })}
                  disabled={form.aktenzeichen_not_received}
                />
                <CheckboxRow
                  checked={form.aktenzeichen_not_received}
                  label="I have not received my file number yet"
                  onChange={(checked) => updateForm({ aktenzeichen_not_received: checked, aktenzeichen_on: checked ? "" : form.aktenzeichen_on })}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-muted">Certificate date, if present</span>
                <Input
                  type="date"
                  value={form.certificate_received_on}
                  onChange={(event) => updateForm({ certificate_received_on: event.target.value })}
                  disabled={form.certificate_not_received}
                />
                <CheckboxRow
                  checked={form.certificate_not_received}
                  label="I have not received my certificate yet"
                  onChange={(checked) => updateForm({ certificate_not_received: checked, certificate_received_on: checked ? "" : form.certificate_received_on })}
                />
              </label>
            </div>
          )}
          {preview ? <ClaimPreviewPanel preview={preview} /> : null}
          {message ? <Alert className="border-success/30 text-success lg:col-span-2">{message}</Alert> : null}
          {error ? <Alert className="border-danger/30 text-danger lg:col-span-2">{error}</Alert> : null}
          <div className="flex justify-end">
            <Button disabled={loading}>
              {preview?.can_confirm ? <CheckCircle2 className="h-4 w-4" /> : <Search className="h-4 w-4" />}
              {loading ? (preview?.can_confirm ? "Claiming..." : "Matching...") : preview?.can_confirm ? "Confirm claim" : "Preview matches"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ClaimPreviewPanel({ preview }: { preview: ClaimPreview }) {
  const matches = preview.possible_matches ?? (preview.match ? [preview.match] : []);
  const toneClass = preview.can_confirm
    ? "border-success/30 text-success"
    : preview.status === "refine"
      ? "border-primary/30"
      : "border-danger/30 text-danger";

  return (
    <Alert className={toneClass}>
      <div className="space-y-3">
        <p>{preview.message ?? "Review the matching result."}</p>
        {matches.length > 0 ? (
          <div className="grid gap-2">
            {matches.map((match, index) => (
              <MatchSummary key={`${match.law_type_id ?? "match"}-${match.submitted_on ?? "unknown"}-${index}`} match={match} index={index} />
            ))}
          </div>
        ) : null}
        {preview.status === "refine" && preview.match_count > matches.length ? (
          <p className="text-xs text-muted-foreground">
            Showing {matches.length} of {preview.match_count} possible matches.
          </p>
        ) : null}
      </div>
    </Alert>
  );
}

function MatchSummary({ match, index }: { match: ClaimMatchSummary; index: number }) {
  const fileNumberDate = match.file_number_received_on ?? match.aktenzeichen_on;
  const fields = [
    lawTypeLabel(match.law_type ?? lawTypeLabels[match.law_type_id ?? ""] ?? match.law_type_id),
    match.submitted_on ? `Submitted ${formatDate(match.submitted_on)}` : null,
    match.submission_country,
    match.handling_office,
    match.application_method,
    fileNumberDate ? `File number ${formatDate(fileNumberDate)}` : null,
    match.certificate_received_on ? `Certificate ${formatDate(match.certificate_received_on)}` : null,
    statusLabels[match.status ?? ""] ?? match.status,
  ].filter(Boolean);

  return (
    <div className="rounded-md border border-border bg-background/55 p-3 text-foreground">
      <p className="text-xs font-semibold uppercase tracking-normal text-muted">Possible match {index + 1}</p>
      {match.source_row_number ? <p className="mt-1 text-xs text-muted-foreground">Spreadsheet row {match.source_row_number}</p> : null}
      <p className="mt-1 text-sm leading-6">{fields.join(" | ")}</p>
    </div>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  if (!year || !month || !day) return value;
  return `${month}/${day}/${year}`;
}

function CheckboxRow({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="mt-2 flex items-start gap-2 text-sm leading-5 text-muted-foreground">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
      />
      <span>{label}</span>
    </label>
  );
}

async function refreshTimelineEstimate(applicationId: string) {
  const response = await fetch("/api/ai/timeline", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ application_id: applicationId }),
  });

  if (response.ok) return null;
  const result = (await response.json().catch(() => null)) as { error?: string } | null;
  return result?.error ?? "Unknown error";
}
