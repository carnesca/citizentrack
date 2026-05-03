"use client";

import type React from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

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

export function ClaimForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
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

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const response = await fetch("/api/claims/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    setLoading(false);

    if (!response.ok) {
      setError(result.error ?? "No exact match found.");
      return;
    }

    setMessage("Historical row copied into your private account.");
    setTimeout(() => router.push("/app"), 700);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          Claim case
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Law type</span>
            <Select value={form.law_type_id} onChange={(event) => setForm({ ...form, law_type_id: event.target.value })}>
              <option value="5_stag_erklarung">5 StAG Erklarung</option>
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
              onChange={(event) => setForm({ ...form, submission_country: event.target.value })}
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
            <Input value={form.handling_office} onChange={(event) => setForm({ ...form, handling_office: event.target.value })} placeholder="BVA, consulate, city office" />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Application method</span>
            <Select value={form.application_method} onChange={(event) => setForm({ ...form, application_method: event.target.value })}>
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
            <Input type="date" value={form.submitted_on} onChange={(event) => setForm({ ...form, submitted_on: event.target.value })} required />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">File number date, if present</span>
            <Input
              type="date"
              value={form.aktenzeichen_on}
              onChange={(event) => setForm({ ...form, aktenzeichen_on: event.target.value })}
              disabled={form.aktenzeichen_not_received}
            />
            <CheckboxRow
              checked={form.aktenzeichen_not_received}
              label="I have not received my file number yet"
              onChange={(checked) => setForm({ ...form, aktenzeichen_not_received: checked, aktenzeichen_on: checked ? "" : form.aktenzeichen_on })}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-muted">Certificate date, if present</span>
            <Input
              type="date"
              value={form.certificate_received_on}
              onChange={(event) => setForm({ ...form, certificate_received_on: event.target.value })}
              disabled={form.certificate_not_received}
            />
            <CheckboxRow
              checked={form.certificate_not_received}
              label="I have not received my certificate yet"
              onChange={(checked) => setForm({ ...form, certificate_not_received: checked, certificate_received_on: checked ? "" : form.certificate_received_on })}
            />
          </label>
          {message ? <Alert className="border-success/30 text-success lg:col-span-2">{message}</Alert> : null}
          {error ? <Alert className="border-danger/30 text-danger lg:col-span-2">{error}</Alert> : null}
          <div className="flex justify-end lg:col-span-2">
            <Button disabled={loading}>{loading ? "Matching..." : "Find and claim"}</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
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
