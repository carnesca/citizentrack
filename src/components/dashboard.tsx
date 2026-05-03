"use client";

import type { DashboardStats } from "@/lib/types";
import { ActivityHighlights } from "@/components/activity-highlights";
import { ApprovalQueueChart } from "@/components/approval-queue-chart";
import { StatsCards } from "@/components/stats-cards";
import { TimelineStats } from "@/components/timeline-stats";
import { TrendsChart } from "@/components/trends-chart";

type DashboardProps = {
  stats: DashboardStats;
};

export function Dashboard({ stats }: DashboardProps) {
  return (
    <div className="mx-auto w-full max-w-[116rem] space-y-6 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground sm:text-3xl">Dashboard</h2>
      </div>

      <StatsCards stats={stats} />

      <ActivityHighlights highlights={stats.activity_highlights} />

      <ApprovalQueueChart stats={stats.approval_queue_stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <TimelineStats laws={stats.law_type_stats} />
        <TrendsChart trends={stats.monthly_trends} />
      </div>
    </div>
  );
}
