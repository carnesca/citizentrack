import { createClient as createPublicClient } from "@supabase/supabase-js";
import type { DashboardStats } from "@/lib/types";

const fallbackStats: DashboardStats = {
  total_applications: 0,
  pending_applications: 0,
  approved_applications: 0,
  rejected_applications: 0,
  law_type_stats: [],
  monthly_trends: [],
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

  return {
    total_applications: data.total_applications,
    pending_applications: data.pending_applications,
    approved_applications: data.approved_applications,
    rejected_applications: data.rejected_applications,
    law_type_stats: data.law_type_stats ?? [],
    monthly_trends: data.monthly_trends ?? [],
    activity_highlights: data.activity_highlights ?? null,
    refreshed_at: data.refreshed_at,
  };
}
