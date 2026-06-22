"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Users,
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

function fmtUsd(v: string | number) {
  const n = parseFloat(String(v));
  if (isNaN(n)) return "$0.00";
  return `$${n.toFixed(7)}`;
}

function fmtNum(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
  return String(v);
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function SummaryCard({
  title,
  value,
  subValue,
  icon: Icon,
  iconClass,
  loading,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  iconClass?: string;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={cn("size-4 text-muted-foreground", iconClass)} />
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

export default function AdminCreditsPage() {
  const [preset, setPreset] = useState<DatePreset>("weekly");

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ["admin-revenue-summary", preset],
    queryFn: () =>
      api.get("/admin/revenue/summary", { params: { dateRangePreset: preset } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: byUsers, isLoading: byUsersLoading } = useQuery({
    queryKey: ["admin-revenue-by-users", preset],
    queryFn: () =>
      api.get("/admin/revenue/by-users", { params: { dateRangePreset: preset } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const { data: timeseries, isLoading: timeseriesLoading } = useQuery({
    queryKey: ["admin-revenue-timeseries", preset],
    queryFn: () =>
      api.get("/admin/revenue/timeseries", { params: { dateRangePreset: preset } }).then((r) => r.data),
    staleTime: 60_000,
  });

  const chartData = (timeseries?.series ?? []).map((b: any) => ({
    date: fmtDate(b.bucket ?? b.date ?? ""),
    revenue: parseFloat(b.totalRevenue ?? b.revenue ?? 0) || 0,
    cost: parseFloat(b.providerCost ?? b.totalProviderCost ?? 0) || 0,
    billed: parseFloat(b.platformMarkup ?? b.totalBilledAmount ?? 0) || 0,
  }));


  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Credits & Revenue</h1>
          <p className="text-sm text-muted-foreground mt-1">Platform-wide revenue and credit management</p>
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

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <SummaryCard
          title="Total Revenue"
          value={fmtUsd(summary?.totals?.platformMarkup ?? "0")}
          subValue="Platform markup"
          icon={TrendingUp}
          iconClass="text-green-500"
          loading={summaryLoading}
        />
        <SummaryCard
          title="Provider Cost"
          value={fmtUsd(summary?.totals?.providerCost ?? "0")}
          subValue="Paid to providers"
          icon={TrendingDown}
          iconClass="text-red-500"
          loading={summaryLoading}
        />
        <SummaryCard
          title="Total Billed"
          value={fmtUsd(summary?.totals?.totalRevenue ?? "0")}
          subValue="To users"
          icon={DollarSign}
          loading={summaryLoading}
        />
        <SummaryCard
          title="Total Requests"
          value={fmtNum(summary?.totals?.totalRequests ?? 0)}
          icon={RefreshCw}
          loading={summaryLoading}
        />
      </div>

      {/* Revenue timeseries */}
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base">Revenue Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {timeseriesLoading ? (
            <Skeleton className="h-52 w-full rounded-none" />
          ) : chartData.length === 0 ? (
            <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
              No data for this period
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={208}>
              <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="billed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="prov" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 0 }}
                  formatter={(v: any, name: any) => [
                    `$${parseFloat(v).toFixed(4)}`,
                    name === "revenue" ? "Revenue" : name === "billed" ? "Billed" : "Provider Cost",
                  ]}
                />
                <Area type="monotone" dataKey="billed" stroke="#10b981" fill="url(#billed)" strokeWidth={2} />
                <Area type="monotone" dataKey="revenue" stroke="#6366f1" fill="url(#rev)" strokeWidth={2} />
                <Area type="monotone" dataKey="cost" stroke="#f43f5e" fill="url(#prov)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Revenue by users */}
      <Card className="rounded-none">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="size-4" />
            Revenue by User
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wider">User</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Requests</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Billed</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Revenue</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Provider Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byUsersLoading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={5}>
                        <Skeleton className="h-5 w-full rounded-none" />
                      </TableCell>
                    </TableRow>
                  ))
                : (byUsers?.data ?? byUsers ?? []).length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-16 text-center text-sm text-muted-foreground">
                        No revenue data for this period.
                      </TableCell>
                    </TableRow>
                  )
                : (byUsers?.data ?? byUsers ?? []).map((u: any) => (
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
                        {fmtNum(u.requests ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {fmtUsd(u.totalRevenue ?? "0")}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-green-600 font-medium">
                        {fmtUsd(u.platformMarkup ?? "0")}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {fmtUsd(u.providerCost ?? "0")}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
