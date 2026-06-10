"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, Key, BarChart3, DollarSign } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";
import api from "@/lib/api";

interface StatsSummary {
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalSpendUsd: number;
  avgLatencyMs: number;
}

interface StatsResponse {
  summary: StatsSummary;
}

interface StatCard {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);
  const activeProject = useProjectStore((s) => s.activeProject);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats", { startDate, endDate, projectId: activeProject?.id }],
    queryFn: () =>
      api
        .get("/api/v1/usage/stats", {
          params: { startDate, endDate, groupBy: "day", projectId: activeProject!.id },
        })
        .then((r) => r.data),
    enabled: !!activeProject,
  });

  const STAT_CARDS = useMemo<StatCard[]>(
    () => [
      {
        label: "Total Requests",
        value: stats?.summary.totalRequests.toLocaleString() ?? "—",
        description: "Last 30 days",
        icon: Activity,
      },
      {
        label: "Total Tokens",
        value: stats?.summary.totalTokens.toLocaleString() ?? "—",
        description: "Prompt + completion tokens",
        icon: BarChart3,
      },
      {
        label: "Total Spend",
        value:
          stats?.summary.totalSpendUsd != null
            ? `$${stats.summary.totalSpendUsd.toFixed(2)}`
            : "$0.00",
        description: "Last 30 days",
        icon: DollarSign,
      },
      {
        label: "Active Keys",
        value: "0",
        description: "Currently active API keys",
        icon: Key,
      },
    ],
    [stats]
  );

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {user?.firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a summary of your account activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ label, value, description, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24 rounded-lg" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value}</p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
