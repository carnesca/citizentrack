"use client";

import { CheckCircle2, Clock, FileText, XCircle } from "lucide-react";
import type { DashboardStats } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";

export function StatsCards({ stats }: { stats: DashboardStats }) {
  const cards = [
    {
      title: "Total Applications",
      value: stats.total_applications,
      icon: FileText,
      description: "All tracked applications",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Pending",
      value: stats.pending_applications,
      icon: Clock,
      description: "Currently processing",
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
    {
      title: "Approved",
      value: stats.approved_applications,
      icon: CheckCircle2,
      description: "Successfully completed",
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Rejected",
      value: stats.rejected_applications,
      icon: XCircle,
      description: "Not approved",
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <Card key={card.title} className="border-border bg-card">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">{card.title}</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-foreground sm:text-3xl">{formatNumber(card.value)}</p>
                  <p className="mt-1 hidden text-xs text-muted-foreground sm:block">{card.description}</p>
                </div>
                <div className={`rounded-lg p-2 sm:p-3 ${card.bgColor}`}>
                  <Icon className={`h-5 w-5 sm:h-6 sm:w-6 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
