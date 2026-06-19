"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Activity, UserCheck, UserX, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type DatePreset = "today" | "past_24h" | "weekly" | "monthly" | "yearly";

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "past_24h", label: "24h" },
  { key: "weekly", label: "7d" },
  { key: "monthly", label: "30d" },
  { key: "yearly", label: "1y" },
];

function fmtUsd(v: string | number) {
  return `$${parseFloat(String(v)).toFixed(4)}`;
}

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function StatCard({
  title,
  value,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-16 rounded-none" /> : <p className="text-2xl font-bold">{value}</p>}
      </CardContent>
    </Card>
  );
}

export default function AdminUsersPage() {
  const [preset, setPreset] = useState<DatePreset>("weekly");

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ["admin-overview-users", preset],
    queryFn: () =>
      api.get("/admin/overview", { params: { dateRangePreset: preset } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["admin-activity-users", preset],
    queryFn: () =>
      api
        .get("/admin/activity/by-users", { params: { dateRangePreset: preset } })
        .then((r) => r.data),
    staleTime: 60_000,
  });

  const summary = overview?.summary;
  const isLoading = overviewLoading || activityLoading;

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground mt-1">User activity and platform engagement</p>
        </div>
        <div className="flex overflow-hidden rounded-none border border-border">
          {PRESETS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPreset(key)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium transition-colors",
                preset === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* User stat cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard title="Total Users" value={summary?.totalUsers ?? 0} icon={Users} loading={isLoading} />
        <StatCard title="Active" value={summary?.activeUsers ?? 0} icon={UserCheck} loading={isLoading} />
        <StatCard title="Suspended" value={summary?.suspendedUsers ?? 0} icon={UserX} loading={isLoading} />
        <StatCard title="Inactive" value={summary?.inactiveUsers ?? 0} icon={Clock} loading={isLoading} />
      </div>

      {/* User activity table */}
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="size-4" />
            User Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wider">User</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Requests</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Tokens</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Spend</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Success Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-5 w-full rounded-none" />
                      </TableCell>
                    </TableRow>
                  ))
                : (activity?.data ?? []).length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                        No activity found for this period.
                      </TableCell>
                    </TableRow>
                  )
                : (activity?.data ?? []).map((u: any) => {
                    const successRate =
                      u.totalRequests > 0
                        ? ((u.successRequests / u.totalRequests) * 100).toFixed(1)
                        : "—";
                    return (
                      <TableRow key={u.userId}>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {u.firstName && u.lastName
                              ? `${u.firstName} ${u.lastName}`
                              : u.email ?? u.userId}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmtNum(u.totalRequests ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmtNum(u.totalTokens ?? 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {fmtUsd(u.totalCost ?? "0")}
                        </TableCell>
                        <TableCell className="text-right">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              parseFloat(successRate) >= 95
                                ? "text-green-600"
                                : parseFloat(successRate) >= 80
                                ? "text-amber-600"
                                : "text-red-500"
                            )}
                          >
                            {successRate !== "—" ? `${successRate}%` : "—"}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Top users from overview */}
      {(overview?.topUsers ?? []).length > 0 && (
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-base">Top Users by Spend</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider">User</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Requests</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Tokens</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Total Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(overview.topUsers as any[]).map((u: any) => (
                  <TableRow key={u.userId}>
                    <TableCell>
                      <p className="text-sm font-medium">
                        {u.firstName && u.lastName
                          ? `${u.firstName} ${u.lastName}`
                          : u.email ?? u.userId}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtNum(u.requests)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtNum(u.totalTokens ?? 0)}</TableCell>
                    <TableCell className="text-right text-sm tabular-nums">{fmtUsd(u.totalCost)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
