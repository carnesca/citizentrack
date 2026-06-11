"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Ellipsis, FilePenLine, FilePlus2, Search, Trash2, X } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TimelineEstimate } from "@/components/timeline-estimate";
import { createClient } from "@/lib/supabase/browser";
import type { ApplicationTimelinePrediction, CitizenshipApplication } from "@/lib/types";
import { lawTypeLabel } from "@/lib/utils";

export function ApplicationList() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const estimateRefreshFailed = searchParams.get("estimate_refresh") === "failed";
  const [applications, setApplications] = useState<CitizenshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [predictions, setPredictions] = useState<Record<string, ApplicationTimelinePrediction>>({});
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("citizenship_applications")
      .select("*")
      .order("updated_at", { ascending: false })
      .then(({ data }) => {
        setApplications((data ?? []) as CitizenshipApplication[]);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!applications.length) {
      setPredictions({});
      return;
    }

    const controller = new AbortController();
    const ids = applications.map((application) => application.id).join(",");
    fetch(`/api/ai/timeline?application_ids=${encodeURIComponent(ids)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) return { predictions: [] };
        return (await response.json()) as { predictions?: ApplicationTimelinePrediction[] };
      })
      .then((result) => {
        const next = Object.fromEntries((result.predictions ?? []).map((prediction) => [prediction.application_id, prediction]));
        setPredictions(next);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setPredictions({});
      });

    return () => controller.abort();
  }, [applications]);

  async function deleteApplication(application: CitizenshipApplication) {
    setDeletingId(application.id);
    setDeleteError(null);

    const response = await fetch(`/api/applications/${application.id}`, { method: "DELETE" });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setDeleteError(result?.error ?? "Could not delete application.");
      setDeletingId(null);
      return;
    }

    setApplications((current) => current.filter((item) => item.id !== application.id));
    setConfirmDeleteId(null);
    setOpenMenuId(null);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <section className="mb-16 rounded-lg border border-border/70 bg-[radial-gradient(circle_at_top_left,color-mix(in_srgb,var(--primary)_13%,transparent),transparent_26rem),linear-gradient(180deg,color-mix(in_srgb,var(--surface-elevated)_90%,transparent),var(--card))] px-4 py-5 shadow-[0_24px_70px_color-mix(in_srgb,var(--shadow)_58%,transparent),inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-7 sm:py-7 lg:px-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Your applications</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Manage your citizenship applications and estimated timelines.</p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          <Link href="/app/application" className="w-full sm:w-auto">
            <Button size="sm" className="h-10 w-full border-0 shadow-none sm:w-auto">
              <FilePlus2 className="h-4 w-4" /> Add application
            </Button>
          </Link>
          <Link href="/app/claim" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="h-10 w-full border-0 bg-primary/10 text-primary shadow-none hover:bg-primary/15 sm:w-auto">
              <Search className="h-4 w-4" /> Claim case
            </Button>
          </Link>
        </div>
      </header>

      <div className="mt-7">
        {loading ? <p className="text-sm text-muted-foreground">Loading your applications...</p> : null}
        {deleteError ? (
          <div className="mb-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </div>
        ) : null}
        {estimateRefreshFailed ? (
          <Alert className="mb-3 border-warning/30 bg-warning/10 text-warning">
            Your application was saved, but the estimated timeline could not refresh. Update and save the application again to retry.
          </Alert>
        ) : null}
        {!loading && applications.length === 0 ? (
          <div className="rounded-2xl bg-background/35 px-4 py-8 text-center">
            <p className="text-muted">No private applications yet.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/app/application" className="w-full sm:w-auto"><Button className="w-full border-0 shadow-none sm:w-auto"><FilePlus2 className="h-4 w-4" /> Add application</Button></Link>
              <Link href="/app/claim" className="w-full sm:w-auto"><Button variant="outline" className="w-full border-0 bg-primary/10 text-primary shadow-none hover:bg-primary/15 sm:w-auto"><Search className="h-4 w-4" /> Claim case</Button></Link>
            </div>
          </div>
        ) : null}
        <div className="grid gap-5">
          {applications.map((application) => (
            <article key={application.id} className="min-w-0 rounded-lg bg-background/35 px-4 py-4 sm:px-5 sm:py-5">
              <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="truncate text-2xl font-semibold tracking-tight text-foreground">{lawLabel(application.law_type_id)}</h3>
                    <Badge tone={statusTone(application.status)} className="w-fit">
                      {statusLabel(application.status)}
                    </Badge>
                    <p className="text-sm text-muted-foreground">Submitted {formatDate(application.submitted_on)}</p>
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-[auto_auto] lg:justify-end">
                  {confirmDeleteId === application.id ? (
                    <>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={deletingId === application.id}
                        onClick={() => deleteApplication(application)}
                      >
                        <Trash2 className="h-4 w-4" /> {deletingId === application.id ? "Deleting..." : "Confirm delete"}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full sm:w-auto"
                        disabled={deletingId === application.id}
                        onClick={() => {
                          setConfirmDeleteId(null);
                          setOpenMenuId(null);
                        }}
                      >
                        <X className="h-4 w-4" /> Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Link href={`/app/application?id=${application.id}`} className="min-w-0">
                        <Button variant="secondary" size="sm" className="h-9 w-full border-0 bg-primary/10 text-primary shadow-none hover:bg-primary/15 sm:w-auto">
                          <FilePenLine className="h-4 w-4" /> Update details
                        </Button>
                      </Link>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          className="h-9 w-full text-muted-foreground hover:bg-accent hover:text-foreground sm:w-9"
                          aria-label={`More actions for ${lawLabel(application.law_type_id)}`}
                          aria-expanded={openMenuId === application.id}
                          onClick={() => setOpenMenuId((current) => (current === application.id ? null : application.id))}
                        >
                          <Ellipsis className="h-4 w-4" />
                        </Button>
                        {openMenuId === application.id ? (
                          <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-border bg-card p-1.5 shadow-[0_18px_54px_color-mix(in_srgb,var(--shadow)_80%,transparent)]">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                              onClick={() => {
                                setDeleteError(null);
                                setConfirmDeleteId(application.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" /> Delete application
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-5">
                <TimelineEstimate prediction={predictions[application.id]} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function statusTone(status: CitizenshipApplication["status"]) {
  if (status === "certificate_received") return "green";
  if (status === "rejected") return "red";
  if (status === "aktenzeichen_received") return "amber";
  return "blue";
}

function statusLabel(status: CitizenshipApplication["status"]) {
  if (status === "aktenzeichen_received") return "File number received";
  if (status === "certificate_received") return "Certificate received";
  return status.replaceAll("_", " ");
}

function lawLabel(value: string) {
  const normalized = lawTypeLabel(value);
  if (normalized !== value) return normalized;

  return normalized
    .replace("stag_10", "StAG 10")
    .replace("stag_14", "StAG 14")
    .replace("stag_15", "StAG 15")
    .replace("artikel_116", "Artikel 116")
    .replaceAll("_", " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
