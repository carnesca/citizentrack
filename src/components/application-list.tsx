"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarClock, FilePenLine, FilePlus2, Search, Sparkles, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/browser";
import type { CitizenshipApplication } from "@/lib/types";

export function ApplicationList() {
  const router = useRouter();
  const [applications, setApplications] = useState<CitizenshipApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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
    setDeletingId(null);
    router.refresh();
  }

  return (
    <Card className="gap-3 py-4">
      <CardHeader className="flex flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base sm:text-lg">
          <CalendarClock className="h-5 w-5 text-primary" />
          <span className="truncate">Your Applications</span>
        </CardTitle>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Link href="/app/application" className="w-full sm:w-auto">
            <Button size="sm" className="w-full sm:w-auto">
              <FilePlus2 className="h-4 w-4" /> Add application
            </Button>
          </Link>
          <Link href="/app/claim" className="w-full sm:w-auto">
            <Button variant="outline" size="sm" className="w-full border-primary/35 bg-primary/10 text-primary shadow-sm hover:bg-primary/15 sm:w-auto">
              <Search className="h-4 w-4" /> Claim case
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-5">
        {loading ? <p className="text-sm text-muted">Loading your applications...</p> : null}
        {deleteError ? (
          <div className="mb-3 rounded-md border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {deleteError}
          </div>
        ) : null}
        {!loading && applications.length === 0 ? (
          <div className="py-5 text-center">
            <p className="text-muted">No private applications yet.</p>
            <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row">
              <Link href="/app/application" className="w-full sm:w-auto"><Button className="w-full sm:w-auto"><FilePlus2 className="h-4 w-4" /> Add application</Button></Link>
              <Link href="/app/claim" className="w-full sm:w-auto"><Button variant="outline" className="w-full border-primary/35 bg-primary/10 text-primary shadow-sm hover:bg-primary/15 sm:w-auto"><Search className="h-4 w-4" /> Claim case</Button></Link>
            </div>
          </div>
        ) : null}
        <div className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface">
          {applications.map((application) => (
            <article key={application.id} className="grid min-w-0 gap-3 px-3 py-3 transition-colors hover:bg-accent/45 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:px-4">
              <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-start gap-x-3 gap-y-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">{lawLabel(application.law_type_id)}</h3>
                  <Badge tone={statusTone(application.status)} className="w-fit">
                    {statusLabel(application.status)}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Submitted {formatDate(application.submitted_on)}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
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
                      <Trash2 className="h-4 w-4" /> {deletingId === application.id ? "Deleting..." : "Delete"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full sm:w-auto"
                      disabled={deletingId === application.id}
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      <X className="h-4 w-4" /> Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href={`/app/application?id=${application.id}`} className="min-w-0">
                      <Button variant="ghost" size="sm" className="w-full text-primary sm:w-auto">
                        <FilePenLine className="h-4 w-4" /> Update
                      </Button>
                    </Link>
                    <Link href={`/app/estimate?application=${application.id}`} className="min-w-0">
                      <Button size="sm" className="w-full sm:w-auto">
                        <Sparkles className="h-4 w-4" /> Estimate
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="col-span-2 w-full text-destructive hover:bg-destructive/10 sm:col-span-1 sm:w-auto"
                      onClick={() => {
                        setDeleteError(null);
                        setConfirmDeleteId(application.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </Button>
                  </>
                )}
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
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
  return value
    .replace("stag_10", "StAG 10")
    .replace("stag_14", "StAG 14")
    .replace("stag_15", "StAG 15")
    .replace("5_stag_erklarung", "5 StAG Erklarung")
    .replace("artikel_116", "Artikel 116")
    .replaceAll("_", " ");
}

function formatDate(value: string | null) {
  if (!value) return "Unknown";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
