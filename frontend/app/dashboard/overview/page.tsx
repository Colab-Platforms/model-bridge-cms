"use client";

import * as React from "react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Wallet, 
  DollarSign, 
  Activity, 
  Zap, 
  FolderKanban, 
  Key, 
  CheckCircle2, 
  Gauge,
  BrainCircuit,
  Box
} from "lucide-react";

import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { MetricCard } from "@/components/overview/metric-card";
import { MiniMetricCard } from "@/components/overview/mini-metric-card";
import { SpendOverviewChart } from "@/components/overview/spend-overview-chart";
import { QuickActions } from "@/components/overview/quick-actions";
import { DonutChartCard } from "@/components/overview/donut-chart-card";
import { DataListCard } from "@/components/overview/data-list-card";
import { StatusRow, type DatePreset } from "@/components/overview/status-row";
import { ActivityAndWallet } from "@/components/overview/activity-and-wallet";
import { Skeleton } from "@/components/ui/skeleton";

// Maps frontend preset labels → backend-accepted dateRangePreset values.
// Backend accepts: "today" | "past_24h" | "weekly" | "monthly" | "yearly" | "custom"
// "90d" has no backend preset, so we derive custom from/to dates for it.
const PRESET_MAP: Record<string, string> = {
  "7d":  "weekly",
  "30d": "monthly",
};

function nDaysAgoIso(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);

  const [preset, setPreset]           = useState<DatePreset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");

  const queryParams = useMemo(() => {
    if (preset === "90d") {
      return {
        dateRangePreset: "custom",
        from: nDaysAgoIso(90),
        to: new Date().toISOString(),
      };
    }
    if (preset === "custom") {
      const params: Record<string, string> = {};
      if (customStart) params.from = `${customStart}T00:00:00.000Z`;
      if (customEnd)   params.to   = `${customEnd}T23:59:59.000Z`;
      if (customStart && customEnd) params.dateRangePreset = "custom";
      return params;
    }
    return { dateRangePreset: PRESET_MAP[preset] ?? "weekly" };
  }, [preset, customStart, customEnd]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["overview", queryParams],
    queryFn: () => api.get("/overview", { params: queryParams }).then((r) => r.data),
    staleTime: 60 * 1000,
  });

  const summary = data?.summary;
  const usage = data?.usage;
  const charts = data?.charts;

  // Mock sparkline data (in production, this would come from the trend data)
  const sparklineData = charts?.usageTrend?.slice(-7).map((b: any) => ({ value: parseFloat(b.totalCost) })) || [];
  const requestsSparkline = charts?.usageTrend?.slice(-7).map((b: any) => ({ value: b.requests })) || [];

  return (
    <div className="mx-auto max-w-(--breakpoint-2xl) space-y-8 pb-10">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {getGreeting()}, {user?.firstName || "Tech"}! 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Here&apos;s what&apos;s happening with your API usage today.
          </p>
        </div>
        
        <StatusRow
          onRefresh={refetch}
          isRefreshing={isFetching}
          preset={preset}
          onPresetChange={setPreset}
          customStart={customStart}
          customEnd={customEnd}
          onCustomStartChange={setCustomStart}
          onCustomEndChange={setCustomEnd}
        />
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <MetricCard
          title="Wallet Balance"
          value={`$${parseFloat(summary?.walletBalance || "0").toFixed(2)}`}
          subValue={summary?.currency || "USD"}
          icon={Wallet}
          variant="primary"
          isLoading={isLoading}
          footer={
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground/60 uppercase">Status</span>
              <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                {summary?.walletStatus || "Optimal"}
              </span>
            </div>
          }
        />
        <MetricCard
          title="Total Spend"
          value={`$${parseFloat(summary?.totalSpend || "0").toFixed(3)}`}
          subValue="This week"
          icon={DollarSign}
          variant="success"
          isLoading={isLoading}
          trend={{ value: "14%", isPositive: true }}
          sparklineData={sparklineData}
        />
        <MetricCard
          title="Total Requests"
          value={summary?.totalRequests.toLocaleString() || "0"}
          subValue="This week"
          icon={Activity}
          variant="primary"
          isLoading={isLoading}
          trend={{ value: "8.6%", isPositive: true }}
          sparklineData={requestsSparkline}
        />
      </div>

      {/* Secondary Metric Grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <MiniMetricCard 
          label="Total Tokens" 
          value={formatTokens(summary?.totalTokens || 0)} 
          icon={Zap} 
          trend={{ value: "12.4%", isPositive: true }}
          isLoading={isLoading}
        />
        <MiniMetricCard 
          label="Active Projects" 
          value={summary?.activeProjects.toString() || "0"} 
          icon={FolderKanban} 
          trend={{ value: "9.1%", isPositive: true }}
          isLoading={isLoading}
        />
        <MiniMetricCard 
          label="Active API Keys" 
          value={summary?.activeApiKeys.toString() || "0"} 
          icon={Key} 
          trend={{ value: "5.3%", isPositive: true }}
          isLoading={isLoading}
        />
        <MiniMetricCard 
          label="Success Rate" 
          value={`${summary?.successRate || 0}%`} 
          icon={CheckCircle2} 
          trend={{ value: "1.2%", isPositive: true }}
          isLoading={isLoading}
        />
        <MiniMetricCard 
          label="Avg Latency" 
          value={`${Math.round(summary?.avgLatencyMs || 0)}ms`} 
          icon={Gauge} 
          trend={{ value: "3.4%", isPositive: false }}
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Area: Spend Overview & Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SpendOverviewChart 
          data={charts?.usageTrend.map((b: any) => ({ date: formatDate(b.bucket), value: parseFloat(b.totalCost) })) || []}
          totalSpend={`$${parseFloat(summary?.totalSpend || "0").toFixed(4)}`}
          trend="14%"
          isLoading={isLoading}
        />
        <div className="lg:col-span-1">
          <QuickActions />
        </div>
      </div>

      {/* Breakdown Charts */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <DonutChartCard 
          title="Token Breakdown"
          totalValue={formatTokens(summary?.totalTokens || 0)}
          totalLabel="Total Tokens"
          trend="12.4%"
          isLoading={isLoading}
          data={[
            { name: "Prompt Tokens", value: usage?.tokensBreakdown.prompt || 0, color: "#6366f1", count: formatTokens(usage?.tokensBreakdown.prompt || 0), percentage: "62%" },
            { name: "Completion Tokens", value: usage?.tokensBreakdown.completion || 0, color: "#a5b4fc", count: formatTokens(usage?.tokensBreakdown.completion || 0), percentage: "38%" },
          ]}
        />
        <DonutChartCard 
          title="Request Status"
          totalValue={formatCompact(summary?.totalRequests || 0)}
          totalLabel="Total Requests"
          trend="1.2%"
          isLoading={isLoading}
          data={[
            { name: "Success", value: usage?.requestsByStatus.success || 0, color: "#10b981", percentage: "98.2%" },
            { name: "Failed", value: usage?.requestsByStatus.failed || 0, color: "#f43f5e", percentage: "1.1%" },
            { name: "Partial", value: usage?.requestsByStatus.partial || 0, color: "#f59e0b", percentage: "0.4%" },
            { name: "Pending", value: usage?.requestsByStatus.pending || 0, color: "#3b82f6", percentage: "0.2%" },
            { name: "Stopped", value: usage?.requestsByStatus.stopped || 0, color: "#94a3b8", percentage: "0.1%" },
          ]}
        />
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <DataListCard 
          title="Top Models"
          headers={["Model", "Requests", "Tokens", "Cost"]}
          footerHref="/models"
          footerLabel="View all models"
          isLoading={isLoading}
          data={data?.topModels?.slice(0, 5).map((m: any) => ({
            id: m.modelId,
            label: m.displayName || m.slug,
            subLabel: m.provider?.displayName,
            icon: <BrainCircuit className="size-3.5 text-slate-400" />,
            value1: formatCompact(m.requests),
            value2: formatTokens(m.totalTokens),
            value3: `$${parseFloat(m.totalCost).toFixed(2)}`,
            progress: 80 - (data.topModels.indexOf(m) * 10)
          })) || []}
        />
        <DataListCard 
          title="Top Projects"
          headers={["Project", "Requests", "Tokens", "Cost"]}
          footerHref="/dashboard/projects"
          footerLabel="View all projects"
          isLoading={isLoading}
          data={data?.topProjects?.slice(0, 5).map((p: any) => ({
            id: p.projectId,
            label: p.name || p.slug,
            icon: <Box className="size-3.5 text-slate-400" />,
            value1: formatCompact(p.requests),
            value2: formatTokens(p.totalTokens),
            value3: `$${parseFloat(p.totalCost).toFixed(2)}`,
            progress: 75 - (data.topProjects.indexOf(p) * 12)
          })) || []}
        />
        <DataListCard 
          title="Top API Keys"
          headers={["Key", "Requests", "Tokens", "Last Used"]}
          footerHref="/dashboard/keys"
          footerLabel="View all API keys"
          isLoading={isLoading}
          data={data?.apiKeys?.topApiKeys?.slice(0, 5).map((k: any) => ({
            id: k.apiKeyId,
            label: k.name || k.keyPrefix,
            icon: <Key className="size-3.5 text-slate-400" />,
            value1: formatCompact(k.requests),
            value2: formatTokens(k.totalTokens),
            value3: k.lastUsedAt ? `${Math.floor((Date.now() - new Date(k.lastUsedAt).getTime()) / 60000)}m ago` : "Never",
            progress: 70 - (data.apiKeys.topApiKeys.indexOf(k) * 15)
          })) || []}
        />
      </div>

      {/* Activity & Wallet */}
      <ActivityAndWallet 
        isLoading={isLoading}
        transactions={data?.wallet?.recentTransactions?.slice(0, 5) || []}
        wallet={{
          currentBalance: parseFloat(summary?.walletBalance || "0").toFixed(2),
          totalCredits: data?.wallet?.totalCreditsAdded || "0",
          totalUsage: parseFloat(data?.wallet?.totalUsageDeducted || "0").toFixed(3),
          totalRefunded: data?.wallet?.totalRefunded || "0",
          totalTransactions: parseFloat(data?.wallet?.totalTransactionsAmount || 0).toFixed(2)
        }}
      />
    </div>
  );
}

// Helpers
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
