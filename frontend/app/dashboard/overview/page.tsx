"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Key,
  DollarSign,
  Sparkles,
  Zap,
  Layers,
  ChevronRight,
  Wallet,
  FolderKanban,
  CheckCircle2,
  Gauge,
  History,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { SpendAreaChart } from "@/components/charts/SpendAreaChart";
import { UsageStackedBarChart } from "@/components/charts/UsageStackedBarChart";
import { ModelPieChart, type PieSlice } from "@/components/charts/ModelPieChart";
import { ChartBarLabelCustom, type ChartBarLabelItem } from "@/components/charts/chart-bar-label-custom";
import { cn } from "@/lib/utils";

// ── Types (mirrors GET /overview response) ─────────────────────────────────

type DateRangePreset = "today" | "past_24h" | "weekly" | "monthly" | "yearly" | "custom";

interface OverviewSummary {
  walletBalance: string;
  currency: string;
  walletStatus: string | null;
  totalSpend: string;
  totalRequests: number;
  totalTokens: number;
  activeProjects: number;
  activeApiKeys: number;
  successRate: number;
  avgLatencyMs: number;
}

interface OverviewUsage {
  requestsByStatus: {
    success: number;
    failed: number;
    stopped: number;
    pending: number;
    partial: number;
  };
  tokensBreakdown: { prompt: number; completion: number; total: number };
  dateRange: { preset: string; from: string | null; to: string | null };
}

interface OverviewProviderRef {
  id: string;
  slug: string;
  displayName: string;
}

interface OverviewTopModel {
  modelId: string;
  slug: string | null;
  displayName: string | null;
  provider: OverviewProviderRef | null;
  requests: number;
  totalTokens: number;
  totalCost: string;
}

interface OverviewTopProject {
  projectId: string;
  name: string | null;
  slug: string | null;
  isActive: boolean;
  requests: number;
  totalTokens: number;
  totalCost: string;
}

interface OverviewTopApiKey {
  apiKeyId: string;
  name: string | null;
  keyPrefix: string | null;
  status: string | null;
  project: { id: string; name: string; slug: string } | null;
  requests: number;
  totalTokens: number;
  totalCost: string;
  lastUsedAt: string | null;
}

interface OverviewTransaction {
  id: string;
  type: string;
  amount: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
}

interface OverviewWallet {
  currentBalance: string;
  currency: string;
  lowBalanceAlert: boolean;
  totalCreditsAdded: string;
  totalUsageDeducted: string;
  totalRefunded: string;
  totalTransactionsAmount: string;
  recentTransactions: OverviewTransaction[];
}

interface OverviewChartsBucket {
  bucket: string;
  requests: number;
  totalTokens: number;
  totalCost: string;
}

interface OverviewResponse {
  summary: OverviewSummary;
  usage: OverviewUsage;
  topModels: OverviewTopModel[];
  topProjects: OverviewTopProject[];
  apiKeys: { topApiKeys: OverviewTopApiKey[] };
  wallet: OverviewWallet;
  charts: { granularity: string; usageTrend: OverviewChartsBucket[] };
}

interface QuickAction {
  label: string;
  description: string;
  icon: LucideIcon;
  href: string;
  color: string;
}

// ── Animation Variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 400, damping: 30 },
  },
};

// ── Stat Card ─────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon: Icon,
  badge,
  footer,
  isLoading,
  iconClass,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  badge?: string;
  footer: string;
  isLoading: boolean;
  iconClass: string;
}) {
  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <span
            className={cn(
              "inline-flex size-6 items-center justify-center rounded-md",
              iconClass
            )}
          >
            <Icon className="size-3.5" />
          </span>
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {isLoading ? <Skeleton className="h-8 w-28 rounded-lg" /> : value}
        </CardTitle>
        {badge && !isLoading && (
          <CardAction>
            <Badge variant="outline">{badge}</Badge>
          </CardAction>
        )}
      </CardHeader>
      <CardFooter className="text-xs text-muted-foreground">{footer}</CardFooter>
    </Card>
  );
}

// ── Chart card shell (loading / empty aware) ────────────────────────────────

function ChartShell({
  isLoading,
  children,
}: {
  isLoading: boolean;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-48 w-full rounded-lg" />
        </CardContent>
      </Card>
    );
  }
  return <>{children}</>;
}

// ── Quick Actions ─────────────────────────────────────────────────────────────

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Create API Key",
    description: "Generate a new key for your app",
    icon: Key,
    href: "/dashboard/keys",
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    label: "Top-up Wallet",
    description: "Add credits to keep running",
    icon: DollarSign,
    href: "/dashboard/credits",
    color: "bg-emerald-500/10 text-emerald-500",
  },
  {
    label: "View Logs",
    description: "Debug your recent requests",
    icon: Activity,
    href: "/dashboard/usage",
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    label: "Browse Models",
    description: "Find the best AI for your task",
    icon: Sparkles,
    href: "/models",
    color: "bg-violet-500/10 text-violet-500",
  },
];

const PRESET_OPTIONS: { value: DateRangePreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "past_24h", label: "Past 24 Hours" },
  { value: "weekly", label: "Past 7 Days" },
  { value: "monthly", label: "Past 30 Days" },
  { value: "yearly", label: "Past Year" },
  { value: "custom", label: "Custom Range" },
];

const TRANSACTION_TYPE_STYLE: Record<
  string,
  { bg: string; text: string; label: string; sign: "+" | "-" | "" }
> = {
  TOPUP: { bg: "bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400", label: "Top-up", sign: "+" },
  CREDIT_GRANT: { bg: "bg-blue-500/10", text: "text-blue-600 dark:text-blue-400", label: "Credit Granted", sign: "+" },
  USAGE_DEDUCTION: { bg: "bg-rose-500/10", text: "text-rose-600 dark:text-rose-400", label: "Usage", sign: "-" },
  REFUND: { bg: "bg-teal-500/10", text: "text-teal-600 dark:text-teal-400", label: "Refund", sign: "+" },
  ADJUSTMENT: { bg: "bg-amber-500/10", text: "text-amber-600 dark:text-amber-400", label: "Adjustment", sign: "" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return n.toString();
}

function fmtUsd(value: string | number | undefined, decimals = 4): string {
  const n = typeof value === "number" ? value : parseFloat(value ?? "0");
  if (Number.isNaN(n)) return `$${(0).toFixed(decimals)}`;
  return `$${n.toFixed(decimals)}`;
}

function fmtDateTime(ts: string): string {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);

  const [preset, setPreset] = useState<DateRangePreset>("weekly");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const queryParams = useMemo(() => {
    const p: Record<string, string> = { dateRangePreset: preset };
    if (preset === "custom") {
      if (customFrom) p.from = `${customFrom}T00:00:00.000Z`;
      if (customTo) p.to = `${customTo}T23:59:59.000Z`;
    }
    return p;
  }, [preset, customFrom, customTo]);

  const { data, isLoading, isFetching, refetch } = useQuery<OverviewResponse>({
    queryKey: ["overview", queryParams],
    queryFn: () => api.get("/overview", { params: queryParams }).then((r) => r.data),
  });

  const summary = data?.summary;
  const usage = data?.usage;

  const usageTrendData = useMemo(
    () =>
      (data?.charts.usageTrend ?? []).map((b) => ({
        date: b.bucket,
        costUsd: parseFloat(b.totalCost),
      })),
    [data]
  );

  const tokensChartData = useMemo(() => {
    if (!usage) return [];
    const trend = data?.charts.usageTrend ?? [];

    if (!trend.length) {
      return [
        {
          date: usage.dateRange.to ?? new Date().toISOString(),
          prompt_tokens: usage.tokensBreakdown.prompt,
          completion_tokens: usage.tokensBreakdown.completion,
        },
      ];
    }

    // Backend only returns a single aggregate prompt/completion split for the
    // whole period, not per-bucket — prorate each bucket's tokens using that ratio.
    const { prompt, completion, total } = usage.tokensBreakdown;
    const promptRatio = total > 0 ? prompt / total : 0;
    const completionRatio = total > 0 ? completion / total : 0;

    return trend.map((bucket) => ({
      date: bucket.bucket,
      prompt_tokens: Math.round(bucket.totalTokens * promptRatio),
      completion_tokens: Math.round(bucket.totalTokens * completionRatio),
    }));
  }, [usage, data]);

  const tokensCategories = [
    { id: "prompt", label: "Prompt", color: "var(--chart-1)" },
    { id: "completion", label: "Completion", color: "var(--chart-2)" },
  ];

  const statusPieData: PieSlice[] = useMemo(() => {
    if (!usage) return [];
    return [
      { name: "Success", value: usage.requestsByStatus.success, color: "#10b981" },
      { name: "Failed", value: usage.requestsByStatus.failed, color: "#ef4444" },
      { name: "Partial", value: usage.requestsByStatus.partial, color: "#f59e0b" },
      { name: "Stopped", value: usage.requestsByStatus.stopped, color: "#71717a" },
      { name: "Pending", value: usage.requestsByStatus.pending, color: "#3b82f6" },
    ];
  }, [usage]);

  const topModelsData: ChartBarLabelItem[] = useMemo(
    () =>
      (data?.topModels ?? []).map((m) => ({
        id: m.modelId,
        label: m.displayName ?? m.slug ?? m.modelId,
        value: parseFloat(m.totalCost),
      })),
    [data]
  );

  const topProjectsData: ChartBarLabelItem[] = useMemo(
    () =>
      (data?.topProjects ?? []).map((p) => ({
        id: p.projectId,
        label: p.name ?? p.slug ?? p.projectId,
        value: parseFloat(p.totalCost),
      })),
    [data]
  );

  const topApiKeysData: ChartBarLabelItem[] = useMemo(
    () =>
      (data?.apiKeys.topApiKeys ?? []).map((k) => ({
        id: k.apiKeyId,
        label: k.name ?? k.keyPrefix ?? k.apiKeyId,
        value: parseFloat(k.totalCost),
      })),
    [data]
  );

  const recentTransactions = data?.wallet.recentTransactions ?? [];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-8"
    >
      {/* ── Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">
            {getGreeting()}, {user?.firstName ?? "there"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Here&apos;s what&apos;s happening across your account
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {preset === "custom" && (
            <>
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </>
          )}
          <Select value={preset} onValueChange={(v) => setPreset(v as DateRangePreset)}>
            <SelectTrigger className="h-8 rounded-xl text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRESET_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            aria-label="Refresh"
            className={cn("transition-all hover:bg-muted/50", isFetching && "animate-spin")}
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </motion.div>

      {/* ── Summary Cards ── */}
      <motion.div
        variants={itemVariants}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Wallet Balance"
          value={fmtUsd(summary?.walletBalance)}
          icon={Wallet}
          badge={summary?.walletStatus ?? undefined}
          footer={`${summary?.currency ?? "USD"} available balance`}
          isLoading={isLoading}
          iconClass="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          label="Total Requests"
          value={summary?.totalRequests.toLocaleString() ?? "0"}
          icon={Activity}
          badge={summary ? `${summary.successRate}% success` : undefined}
          footer="API calls in this period"
          isLoading={isLoading}
          iconClass="bg-blue-500/10 text-blue-500"
        />
        <StatCard
          label="Total Spend"
          value={fmtUsd(summary?.totalSpend)}
          icon={DollarSign}
          footer="Total cost this period"
          isLoading={isLoading}
          iconClass="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          label="Total Tokens"
          value={summary ? formatTokens(summary.totalTokens) : "0"}
          icon={Layers}
          footer="Prompt + completion"
          isLoading={isLoading}
          iconClass="bg-violet-500/10 text-violet-500"
        />
        <StatCard
          label="Active Projects"
          value={summary?.activeProjects.toLocaleString() ?? "0"}
          icon={FolderKanban}
          footer="Currently active"
          isLoading={isLoading}
          iconClass="bg-sky-500/10 text-sky-500"
        />
        <StatCard
          label="Active API Keys"
          value={summary?.activeApiKeys.toLocaleString() ?? "0"}
          icon={Key}
          footer="Currently active"
          isLoading={isLoading}
          iconClass="bg-indigo-500/10 text-indigo-500"
        />
        <StatCard
          label="Success Rate"
          value={summary ? `${summary.successRate}%` : "0%"}
          icon={CheckCircle2}
          footer="Of total requests"
          isLoading={isLoading}
          iconClass="bg-teal-500/10 text-teal-500"
        />
        <StatCard
          label="Avg Latency"
          value={summary ? `${Math.round(summary.avgLatencyMs)}ms` : "0ms"}
          icon={Gauge}
          footer="Average response time"
          isLoading={isLoading}
          iconClass="bg-rose-500/10 text-rose-500"
        />
      </motion.div>

      {/* ── Spend trend + Quick Actions ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={itemVariants} className="lg:col-span-8">
          <SpendAreaChart data={usageTrendData} />
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Zap className="size-4 text-primary" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-0.5 pt-0">
              {QUICK_ACTIONS.map((action) => (
                <a
                  key={action.label}
                  href={action.href}
                  className="group flex items-center gap-3 rounded-xl p-3 transition-all hover:bg-muted/50"
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-lg",
                      action.color
                    )}
                  >
                    <action.icon className="size-4" />
                  </span>
                  <div className="flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-foreground">
                      {action.label}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {action.description}
                    </p>
                  </div>
                  <ChevronRight className="size-4 -translate-x-1 text-muted-foreground opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                </a>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Tokens breakdown + Requests by status ── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <motion.div variants={itemVariants} className="lg:col-span-6">
          <ChartShell isLoading={isLoading}>
            <UsageStackedBarChart
              title="Tokens Breakdown"
              description="Estimated prompt vs completion tokens per day for the selected period"
              data={tokensChartData}
              categories={tokensCategories}
              fixedMetric="tokens"
            />
          </ChartShell>
        </motion.div>

        <motion.div variants={itemVariants} className="lg:col-span-6">
          <ChartShell isLoading={isLoading}>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Requests by Status</CardTitle>
                <CardDescription>Outcome distribution for the selected period</CardDescription>
              </CardHeader>
              <CardContent>
                <ModelPieChart
                  data={statusPieData}
                  formatter={(v) => v.toLocaleString()}
                  emptyMessage="No requests in this period"
                />
              </CardContent>
            </Card>
          </ChartShell>
        </motion.div>
      </div>

      {/* ── Top Models / Projects / API Keys ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartShell isLoading={isLoading}>
          <ChartBarLabelCustom
            title="Top Models"
            description="Ranked by spend in this period"
            data={topModelsData}
            valueFormatter={(v) => fmtUsd(v)}
            emptyMessage="No model usage yet"
          />
        </ChartShell>
        <ChartShell isLoading={isLoading}>
          <ChartBarLabelCustom
            title="Top Projects"
            description="Ranked by spend in this period"
            data={topProjectsData}
            valueFormatter={(v) => fmtUsd(v)}
            emptyMessage="No project usage yet"
          />
        </ChartShell>
        <ChartShell isLoading={isLoading}>
          <ChartBarLabelCustom
            title="Top API Keys"
            description="Ranked by spend in this period"
            data={topApiKeysData}
            valueFormatter={(v) => fmtUsd(v)}
            emptyMessage="No API key usage yet"
          />
        </ChartShell>
      </motion.div>

      {/* ── Recent Activity ── */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <History className="size-4 text-primary" />
              Recent Activity
            </CardTitle>
            <CardDescription>Your latest wallet transactions</CardDescription>
            <CardAction>
              <a
                href="/dashboard/credits"
                className="flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                Explore More
                <ArrowUpRight className="size-3.5" />
              </a>
            </CardAction>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full rounded-lg" />
                ))}
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                No recent activity in this period
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Balance After</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTransactions.map((txn) => {
                    const style = TRANSACTION_TYPE_STYLE[txn.type] ?? {
                      bg: "bg-muted",
                      text: "text-muted-foreground",
                      label: txn.type,
                      sign: "" as const,
                    };
                    return (
                      <TableRow key={txn.id}>
                        <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                          {fmtDateTime(txn.createdAt)}
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                              style.bg,
                              style.text
                            )}
                          >
                            {style.label}
                          </span>
                        </TableCell>
                        <TableCell
                          className={cn("text-right tabular-nums font-medium", style.text)}
                        >
                          {style.sign}
                          {fmtUsd(txn.amount)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {fmtUsd(txn.balanceAfter)}
                        </TableCell>
                        <TableCell className="max-w-[240px] truncate text-sm text-muted-foreground">
                          {txn.description ?? "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
