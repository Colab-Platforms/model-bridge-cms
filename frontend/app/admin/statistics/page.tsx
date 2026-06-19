"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Activity,
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  Key,
  Server,
  BrainCircuit,
  FolderOpen,
  Wallet,
} from "lucide-react";
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  loading,
  className,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  loading?: boolean;
  className?: string;
}) {
  return (
    <Card className={cn("rounded-none", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 rounded-none" />
        ) : (
          <>
            <p className="text-2xl font-bold">{value}</p>
            {subValue && <p className="text-xs text-muted-foreground mt-1">{subValue}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function fmtUsd(v: string | number) {
  return `$${parseFloat(String(v)).toFixed(2)}`;
}

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function AdminStatisticsPage() {
  const [preset, setPreset] = useState<DatePreset>("weekly");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-overview", preset],
    queryFn: () => api.get("/admin/overview", { params: { dateRangePreset: preset } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const summary = data?.summary;
  const charts = data?.charts;

  const chartData = (charts?.usageTrend ?? []).map((b: any) => ({
    date: fmtDate(b.bucket),
    revenue: parseFloat(b.revenue) || 0,
    cost: parseFloat(b.providerCost) || 0,
    requests: b.requests,
  }));

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Statistics</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide metrics and performance</p>
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

      {/* Entity counts */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard title="Total Users" value={summary?.totalUsers ?? 0} subValue={`${summary?.activeUsers ?? 0} active`} icon={Users} loading={isLoading} />
        <StatCard title="Projects" value={summary?.totalProjects ?? 0} subValue={`${summary?.activeProjects ?? 0} active`} icon={FolderOpen} loading={isLoading} />
        <StatCard title="API Keys" value={summary?.totalApiKeys ?? 0} subValue={`${summary?.activeApiKeys ?? 0} active`} icon={Key} loading={isLoading} />
        <StatCard title="Providers" value={summary?.totalProviders ?? 0} subValue={`${summary?.activeProviders ?? 0} active`} icon={Server} loading={isLoading} />
        <StatCard title="Models" value={summary?.totalModels ?? 0} subValue={`${summary?.activeModels ?? 0} active`} icon={BrainCircuit} loading={isLoading} />
        <StatCard title="Wallets" value={summary?.totalWallets ?? 0} subValue={`${summary?.activeWallets ?? 0} active`} icon={Wallet} loading={isLoading} />
      </div>

      {/* Performance metrics */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard title="Total Requests" value={fmtNum(summary?.totalRequests ?? 0)} icon={Activity} loading={isLoading} />
        <StatCard title="Success Rate" value={`${summary?.successRate ?? 0}%`} icon={CheckCircle2} loading={isLoading} />
        <StatCard title="Avg Latency" value={`${Math.round(summary?.avgLatencyMs ?? 0)}ms`} icon={Clock} loading={isLoading} />
        <StatCard title="Total Revenue" value={fmtUsd(summary?.totalRevenue ?? "0")} subValue="Platform markup" icon={TrendingUp} loading={isLoading} />
        <StatCard title="Provider Cost" value={fmtUsd(summary?.totalProviderCost ?? "0")} icon={DollarSign} loading={isLoading} />
      </div>

      {/* Revenue vs Cost chart */}
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base">Revenue vs Provider Cost</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-52 w-full rounded-none" />
          ) : (
            <ResponsiveContainer width="100%" height={208}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="cost" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}
                  formatter={(v: any, name: any) => [`$${parseFloat(v).toFixed(4)}`, name === "revenue" ? "Revenue" : "Provider Cost"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#revenue)" strokeWidth={2} />
                <Area type="monotone" dataKey="cost" stroke="#f43f5e" fill="url(#cost)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Top tables */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top Models */}
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-base">Top Models</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider">Model</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Requests</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3}><Skeleton className="h-5 w-full rounded-none" /></TableCell>
                      </TableRow>
                    ))
                  : (data?.topModels ?? []).map((m: any) => (
                      <TableRow key={m.modelId}>
                        <TableCell>
                          <p className="text-sm font-medium">{m.displayName ?? m.slug ?? m.modelId}</p>
                          <p className="text-xs text-muted-foreground">{m.provider?.displayName}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtNum(m.requests)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtUsd(m.totalCost)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Users */}
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
                  <TableHead className="text-xs uppercase tracking-wider text-right">Spend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3}><Skeleton className="h-5 w-full rounded-none" /></TableCell>
                      </TableRow>
                    ))
                  : (data?.topUsers ?? []).map((u: any) => (
                      <TableRow key={u.userId}>
                        <TableCell>
                          <p className="text-sm font-medium">
                            {u.firstName && u.lastName ? `${u.firstName} ${u.lastName}` : u.email ?? u.userId}
                          </p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtNum(u.requests)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtUsd(u.totalCost)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Providers */}
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-base">Top Providers</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider">Provider</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Requests</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3}><Skeleton className="h-5 w-full rounded-none" /></TableCell>
                      </TableRow>
                    ))
                  : (data?.topProviders ?? []).map((p: any) => (
                      <TableRow key={p.providerId}>
                        <TableCell className="text-sm font-medium">{p.provider?.displayName ?? p.providerId}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtNum(p.requests)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtUsd(p.totalCost)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Top Projects */}
        <Card className="rounded-none">
          <CardHeader>
            <CardTitle className="text-base">Top Projects</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs uppercase tracking-wider">Project</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Requests</TableHead>
                  <TableHead className="text-xs uppercase tracking-wider text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={3}><Skeleton className="h-5 w-full rounded-none" /></TableCell>
                      </TableRow>
                    ))
                  : (data?.topProjects ?? []).map((p: any) => (
                      <TableRow key={p.projectId}>
                        <TableCell>
                          <p className="text-sm font-medium">{p.name ?? p.slug ?? p.projectId}</p>
                          {p.user && (
                            <p className="text-xs text-muted-foreground">{p.user.email}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtNum(p.requests)}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{fmtUsd(p.totalCost)}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Wallet summary */}
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base">Platform Wallet Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Total Balance", value: fmtUsd(data?.wallet?.totalWalletBalance ?? "0") },
              { label: "Credits Added", value: fmtUsd(data?.wallet?.totalCreditsAdded ?? "0") },
              { label: "Usage Deducted", value: fmtUsd(data?.wallet?.totalUsageDeducted ?? "0") },
              { label: "Low Balance Wallets", value: data?.wallet?.lowBalanceWalletsCount ?? 0 },
            ].map(({ label, value }) => (
              <div key={label} className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                {isLoading ? (
                  <Skeleton className="h-6 w-20 rounded-none" />
                ) : (
                  <p className="text-lg font-bold">{value}</p>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
