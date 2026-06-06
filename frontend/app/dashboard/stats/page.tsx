"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { DailySpendChart } from "@/components/charts/DailySpendChart";
import { ModelPieChart } from "@/components/charts/ModelPieChart";

// ── Types ─────────────────────────────────────────────────────────────────────

type Preset = "7d" | "30d" | "90d" | "custom";

interface StatsSummary {
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalSpendUsd: number;
  avgLatencyMs: number;
}
interface ModelBreakdown {
  model: string;
  requestCount: number;
  totalTokens: number;
  totalCostUsd: number;
}
interface KeyBreakdown {
  keyPrefix: string;
  requestCount: number;
  totalCostUsd: number;
}
interface StatsResponse {
  summary: StatsSummary;
  dailySpend: { date: string; costUsd: number }[];
  modelBreakdown: ModelBreakdown[];
  keyBreakdown: KeyBreakdown[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function presetDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

const PRESET_LABELS: { key: Preset; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "custom", label: "Custom" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function StatisticsPage() {
  const [preset, setPreset] = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  const { data, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats", dateRange],
    queryFn: () =>
      api
        .get("/api/v1/usage/stats", {
          params: { ...dateRange, groupBy: "day" },
        })
        .then((r) => r.data),
    enabled: !!dateRange.startDate && !!dateRange.endDate,
  });

  const summaryCards = [
    {
      label: "Total Requests",
      value: data?.summary.totalRequests.toLocaleString() ?? "—",
    },
    {
      label: "Successful Requests",
      value: data?.summary.successfulRequests.toLocaleString() ?? "—",
    },
    {
      label: "Total Tokens",
      value: data?.summary.totalTokens.toLocaleString() ?? "—",
    },
    {
      label: "Total Spend",
      value:
        data?.summary.totalSpendUsd != null
          ? `$${data.summary.totalSpendUsd.toFixed(4)}`
          : "—",
    },
    {
      label: "Avg Latency",
      value:
        data?.summary.avgLatencyMs != null
          ? `${data.summary.avgLatencyMs.toFixed(0)} ms`
          : "—",
    },
  ];

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Statistics</h2>
        <p className="text-sm text-muted-foreground">
          Aggregate usage metrics and spend analytics.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Date range
          </span>
          <div className="flex overflow-hidden rounded-xl border border-border">
            {PRESET_LABELS.map(({ key, label }) => (
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

        {preset === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                From
              </span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">
                To
              </span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          </>
        )}
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {summaryCards.map(({ label, value }) => (
          <Card key={label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24 rounded-lg" />
              ) : (
                <p className="text-2xl font-bold text-foreground">{value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Daily Spend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Daily Spend
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[220px] w-full rounded-xl" />
          ) : (
            <DailySpendChart data={data?.dailySpend ?? []} />
          )}
        </CardContent>
      </Card>

      {/* Model breakdown */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Requests by Model
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[240px] w-full rounded-xl" />
            ) : (
              <ModelPieChart data={data?.modelBreakdown ?? []} />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Model Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full rounded-lg" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead className="text-right">Requests</TableHead>
                    <TableHead className="text-right">Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(data?.modelBreakdown ?? []).map((row) => (
                    <TableRow key={row.model}>
                      <TableCell className="font-mono text-xs">
                        {row.model}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.requestCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {row.totalTokens.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${row.totalCostUsd.toFixed(4)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Per-key breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Per-Key Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : (data?.keyBreakdown ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-4 rounded-b-2xl border-t border-dashed border-border bg-muted/20 py-16 text-center">
              <div className="flex size-12 items-center justify-center rounded-full bg-muted">
                <BarChart2 className="size-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">No key data</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No usage recorded for this period.
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead className="text-right">Requests</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.keyBreakdown ?? []).map((row) => (
                  <TableRow key={row.keyPrefix}>
                    <TableCell className="font-mono text-xs">
                      {row.keyPrefix}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {row.requestCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      ${row.totalCostUsd.toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
