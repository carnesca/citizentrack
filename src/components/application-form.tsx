"use client";

import type React from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Save } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/browser";
import type { CitizenshipApplication } from "@/lib/types";

const lawTypes = [
  ["5_stag_erklarung", "StAG 5"],
  ["feststellung", "Feststellung"],
  ["artikel_116", "Artikel 116"],
  ["stag_10", "StAG 10"],
  ["stag_14", "StAG 14"],
  ["stag_15", "StAG 15"],
];

const statuses = [
  ["submitted", "Submitted"],
  ["aktenzeichen_received", "File number received"],
  ["certificate_received", "Certificate received"],
  ["rejected", "Rejected"],
  ["withdrawn", "Withdrawn"],
  ["unknown", "Unknown"],
];

export function ApplicationForm() {
  const router = useRouter();
  const search = useSearchParams();
  const id = search.get("id");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    law_type_id: "5_stag_erklarung",
    applicant_label: "",
    submission_country: "",
    handling_office: "",
    handling_office_kind: "consulate",
    application_method: "",
    submitted_on: "",
    aktenzeichen_on: "",
    certificate_received_on: "",
    status: "submitted",
    comments: "",
  });
  const [milestonesIncomplete, setMilestonesIncomplete] = useState({
    aktenzeichen: true,
    certificate: true,
  });

  useEffect(() => {
    if (!id) return;
    const supabase = createClient();
    supabase
      .from("citizenship_applications")
      .select("*")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        const app = data as CitizenshipApplication;
        setForm({
          law_type_id: app.law_type_id,
          applicant_label: app.applicant_label ?? "",
          submission_country: app.submission_country ?? "",
          handling_office: app.handling_office ?? "",
          handling_office_kind: app.handling_office_kind ?? "consulate",
          application_method: app.application_method ?? "",
          submitted_on: app.submitted_on ?? "",
          aktenzeichen_on: app.aktenzeichen_on ?? "",
          certificate_received_on: app.certificate_received_on ?? "",
          status: app.status,
          comments: app.comments ?? "",
        });
        setMilestonesIncomplete({
          aktenzeichen: !app.aktenzeichen_on,
          certificate: !app.certificate_received_on,
        });
      });
  }, [id]);

  const duration = useMemo(() => {
    return {
      submissionToAz: monthsBetween(form.submitted_on, form.aktenzeichen_on),
      azToCertificate: monthsBetween(form.aktenzeichen_on, form.certificate_received_on),
    };
  }, [form.submitted_on, form.aktenzeichen_on, form.certificate_received_on]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/login");
      return;
    }

    const payload = {
      ...form,
      owner_id: user.id,
      is_public: false,
      submitted_on: form.submitted_on || null,
      aktenzeichen_on: form.aktenzeichen_on || null,
      certificate_received_on: form.certificate_received_on || null,
      months_submission_to_az: duration.submissionToAz,
      months_az_to_certificate: duration.azToCertificate,
      source_record_key: null,
    };

    const result = id
      ? await supabase.from("citizenship_applications").update(payload).eq("id", id)
      : await supabase.from("citizenship_applications").insert(payload);

    setLoading(false);
    if (result.error) {
      setError(result.error.message);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setMilestoneIncomplete(key: keyof typeof milestonesIncomplete, checked: boolean) {
    setMilestonesIncomplete((current) => ({ ...current, [key]: checked }));
    if (checked && key === "aktenzeichen") set("aktenzeichen_on", "");
    if (checked && key === "certificate") set("certificate_received_on", "");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{id ? "Update application" : "Add application"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-5 lg:grid-cols-2" onSubmit={submit}>
          <Field label="Law type">
            <Select value={form.law_type_id} onChange={(event) => set("law_type_id", event.target.value)}>
              {lawTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(event) => set("status", event.target.value)}>
              {statuses.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </Select>
          </Field>
          <Field label="Country">
            <Input value={form.submission_country} onChange={(event) => set("submission_country", event.target.value)} placeholder="United States" />
          </Field>
          <Field label="Handling office">
            <Input value={form.handling_office} onChange={(event) => set("handling_office", event.target.value)} placeholder="San Francisco / BVA / Munich" />
          </Field>
          <Field label="Submitted on">
            <Input type="date" value={form.submitted_on} onChange={(event) => set("submitted_on", event.target.value)} />
          </Field>
          <Field
            label="File number received on"
            help="Leave blank until you receive your file number."
          >
            <Input
              type="date"
              value={form.aktenzeichen_on}
              onChange={(event) => set("aktenzeichen_on", event.target.value)}
              disabled={milestonesIncomplete.aktenzeichen}
            />
            <CheckboxRow
              checked={milestonesIncomplete.aktenzeichen}
              label="I have not received my file number yet"
              onChange={(checked) => setMilestoneIncomplete("aktenzeichen", checked)}
            />
          </Field>
          <Field
            label="Certificate received on"
            help="Leave blank until the citizenship certificate arrives."
          >
            <Input
              type="date"
              value={form.certificate_received_on}
              onChange={(event) => set("certificate_received_on", event.target.value)}
              disabled={milestonesIncomplete.certificate}
            />
            <CheckboxRow
              checked={milestonesIncomplete.certificate}
              label="I have not received my certificate yet"
              onChange={(checked) => setMilestoneIncomplete("certificate", checked)}
            />
          </Field>
          <Field label="Application method">
            <Input value={form.application_method} onChange={(event) => set("application_method", event.target.value)} placeholder="Mail, online, in person" />
          </Field>
          <div className="lg:col-span-2">
            <Field label="Comments">
              <Textarea value={form.comments} onChange={(event) => set("comments", event.target.value)} placeholder="E.g. StAG 5: German grandmother" />
            </Field>
          </div>
          {error ? <Alert className="border-danger/30 text-danger lg:col-span-2">{error}</Alert> : null}
          <div className="flex justify-end lg:col-span-2">
            <Button disabled={loading}>
              <Save className="h-4 w-4" />
              {loading ? "Saving..." : "Save application"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Field({ label, help, children }: { label: string; help?: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-2 block text-sm font-medium text-muted">{label}</span>
      {help ? <span className="-mt-1 mb-2 block text-xs leading-5 text-muted-foreground">{help}</span> : null}
      {children}
    </div>
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

function monthsBetween(start: string, end: string) {
  if (!start || !end) return null;
  const from = new Date(start);
  const to = new Date(end);
  const days = (to.getTime() - from.getTime()) / 86_400_000;
  if (!Number.isFinite(days) || days < 0) return null;
  return Math.round((days / 30.4375) * 10) / 10;
}
