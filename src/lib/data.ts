import { createClient as createPublicClient } from "@supabase/supabase-js";
import type { ApprovalQueueStats, DashboardStats } from "@/lib/types";
import { createAdminClient } from "@/lib/supabase/admin";

const fallbackStats: DashboardStats = {
  total_applications: 0,
  pending_applications: 0,
  approved_applications: 0,
  rejected_applications: 0,
  law_type_stats: [],
  monthly_trends: [],
  approval_queue_stats: null,
  activity_highlights: null,
  refreshed_at: new Date(0).toISOString(),
};

export async function getDashboardStats(): Promise<DashboardStats> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) return fallbackStats;

  const supabase = createPublicClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const { data, error } = await supabase
    .from("citizenship_dashboard_stats")
    .select("*")
    .eq("id", true)
    .single();

  if (error || !data) return fallbackStats;

  const stats = {
    total_applications: data.total_applications,
    pending_applications: data.pending_applications,
    approved_applications: data.approved_applications,
    rejected_applications: data.rejected_applications,
    law_type_stats: data.law_type_stats ?? [],
    monthly_trends: data.monthly_trends ?? [],
    approval_queue_stats: data.approval_queue_stats ?? null,
    activity_highlights: data.activity_highlights ?? null,
    refreshed_at: data.refreshed_at,
  };

  return {
    ...stats,
    approval_queue_stats: await enrichApprovalQueueStats(stats.approval_queue_stats),
  };
}

type QueueApplicationRow = {
  id: string;
  owner_id: string | null;
  is_public: boolean | null;
  claimed_from_application_id: string | null;
  law_type_id: string;
  submitted_on: string | null;
  certificate_received_on: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
};

async function enrichApprovalQueueStats(stats: ApprovalQueueStats | null): Promise<ApprovalQueueStats | null> {
  if (!stats?.cohorts?.length || !process.env.SUPABASE_SERVICE_ROLE_KEY) return stats;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("citizenship_applications")
      .select(
        "id, owner_id, is_public, claimed_from_application_id, law_type_id, submitted_on, certificate_received_on, status, created_at, updated_at",
      );

    if (error || !data) return stats;

    const approved = getCanonicalApplications(data as QueueApplicationRow[]).filter(
      (application) =>
        application.status === "certificate_received" &&
        application.submitted_on &&
        application.certificate_received_on,
    );

    if (!approved.length) return stats;

    const latestApprovalDate = approved.reduce<Date | null>((latest, application) => {
      const certificateDate = parseDate(application.certificate_received_on);
      if (!certificateDate) return latest;
      return !latest || certificateDate > latest ? certificateDate : latest;
    }, null);

    if (!latestApprovalDate) return stats;

    const windowStart = chooseRecentApprovalWindow(approved, latestApprovalDate);
    const cohortCounts = new Map<string, { total: number; laws: Map<string, number> }>();

    for (const application of approved) {
      const submittedDate = parseDate(application.submitted_on);
      const certificateDate = parseDate(application.certificate_received_on);
      if (!submittedDate || !certificateDate || certificateDate < windowStart || certificateDate > latestApprovalDate) {
        continue;
      }

      const cohortKey = getMonthKey(submittedDate);
      const existing = cohortCounts.get(cohortKey) ?? { total: 0, laws: new Map<string, number>() };
      existing.total += 1;
      existing.laws.set(application.law_type_id, (existing.laws.get(application.law_type_id) ?? 0) + 1);
      cohortCounts.set(cohortKey, existing);
    }

    return {
      ...stats,
      recent_approval_window_label: `${formatMonthDay(windowStart)} - ${formatMonthDay(latestApprovalDate)}`,
      cohorts: stats.cohorts.map((cohort) => {
        const counts = cohortCounts.get(cohort.period_key);

        return {
          ...cohort,
          recent_approved_count: counts?.total ?? 0,
          recent_law_type_breakdown: counts
            ? Array.from(counts.laws.entries())
                .map(([law_type_id, approved_count]) => ({ law_type_id, approved_count }))
                .sort((a, b) => b.approved_count - a.approved_count || a.law_type_id.localeCompare(b.law_type_id))
            : [],
        };
      }),
    };
  } catch {
    return stats;
  }
}

function getCanonicalApplications(rows: QueueApplicationRow[]) {
  const latestClaims = new Map<string, QueueApplicationRow>();

  for (const row of rows) {
    if (!row.claimed_from_application_id) continue;

    const existing = latestClaims.get(row.claimed_from_application_id);
    if (!existing || compareApplicationFreshness(row, existing) > 0) {
      latestClaims.set(row.claimed_from_application_id, row);
    }
  }

  const claimedSourceIds = new Set(latestClaims.keys());
  const unclaimed = rows.filter(
    (row) =>
      !row.claimed_from_application_id &&
      !(row.owner_id === null && row.is_public === true && claimedSourceIds.has(row.id)),
  );

  return [...unclaimed, ...latestClaims.values()];
}

function compareApplicationFreshness(left: QueueApplicationRow, right: QueueApplicationRow) {
  const leftUpdated = Date.parse(left.updated_at ?? "") || 0;
  const rightUpdated = Date.parse(right.updated_at ?? "") || 0;
  if (leftUpdated !== rightUpdated) return leftUpdated - rightUpdated;

  const leftCreated = Date.parse(left.created_at ?? "") || 0;
  const rightCreated = Date.parse(right.created_at ?? "") || 0;
  if (leftCreated !== rightCreated) return leftCreated - rightCreated;

  return left.id.localeCompare(right.id);
}

function chooseRecentApprovalWindow(applications: QueueApplicationRow[], latestApprovalDate: Date) {
  const minimumSample = Math.min(12, applications.length);

  for (const days of [90, 180, 365]) {
    const start = addDays(latestApprovalDate, -days);
    const count = applications.filter((application) => {
      const certificateDate = parseDate(application.certificate_received_on);
      return certificateDate && certificateDate >= start && certificateDate <= latestApprovalDate;
    }).length;

    if (count >= minimumSample) return start;
  }

  return addDays(latestApprovalDate, -365);
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getMonthKey(date: Date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function formatMonthDay(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}
