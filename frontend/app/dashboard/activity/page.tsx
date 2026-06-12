"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, ActivityIcon } from "lucide-react";
import { motion } from "motion/react";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UsageSummaryResponse {
  range: {
    from: string;
    to: string;
  };
  totals: {
    totalRequests: number;
    successRequests: number;
    failedRequests: number;
    stoppedRequests: number;
    partialRequests: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    totalCost: string;
    averageLatencyMs: number;
    averageResponseCompletionTimeMs: number;
  };
}

type ActivityType =
  | "USER_REGISTERED" | "USER_LOGIN" | "USER_LOGOUT"
  | "PROJECT_CREATED" | "PROJECT_UPDATED" | "PROJECT_DELETED"
  | "API_KEY_CREATED" | "API_KEY_UPDATED" | "API_KEY_REVOKED"
  | "WALLET_TOPUP" | "CREDIT_GRANTED" | "REFUND_ISSUED"
  | "USER_SUSPENDED" | "USER_ACTIVATED"
  | "MODEL_CREATED" | "MODEL_UPDATED" | "MODEL_DISABLED"
  | "PROVIDER_ENABLED" | "PROVIDER_DISABLED";

interface ActivityLog {
  id: string;
  activityType: ActivityType;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

interface ActivityResponse {
  data: ActivityLog[];
  total: number;
  page: number;
  limit: number;
}

type Preset = "7d" | "30d" | "90d" | "custom";

// ── Config ────────────────────────────────────────────────────────────────────

const ACTIVITY_GROUPS: Record<string, ActivityType[]> = {
  Auth:      ["USER_REGISTERED", "USER_LOGIN", "USER_LOGOUT"],
  Project:   ["PROJECT_CREATED", "PROJECT_UPDATED", "PROJECT_DELETED"],
  "API Key": ["API_KEY_CREATED", "API_KEY_UPDATED", "API_KEY_REVOKED"],
  Wallet:    ["WALLET_TOPUP", "CREDIT_GRANTED", "REFUND_ISSUED"],
  Account:   ["USER_SUSPENDED", "USER_ACTIVATED"],
  Model:     ["MODEL_CREATED", "MODEL_UPDATED", "MODEL_DISABLED"],
  Provider:  ["PROVIDER_ENABLED", "PROVIDER_DISABLED"],
};

const TYPE_STYLE: Record<ActivityType, { badge: string; label: string }> = {
  USER_REGISTERED:  { badge: "bg-green-100 text-green-700",   label: "Registered" },
  USER_LOGIN:       { badge: "bg-blue-100 text-blue-700",     label: "Login" },
  USER_LOGOUT:      { badge: "bg-zinc-100 text-zinc-500",     label: "Logout" },
  PROJECT_CREATED:  { badge: "bg-violet-100 text-violet-700", label: "Project created" },
  PROJECT_UPDATED:  { badge: "bg-violet-100 text-violet-700", label: "Project updated" },
  PROJECT_DELETED:  { badge: "bg-red-100 text-red-700",       label: "Project deleted" },
  API_KEY_CREATED:  { badge: "bg-indigo-100 text-indigo-700", label: "Key created" },
  API_KEY_UPDATED:  { badge: "bg-indigo-100 text-indigo-700", label: "Key updated" },
  API_KEY_REVOKED:  { badge: "bg-red-100 text-red-700",       label: "Key revoked" },
  WALLET_TOPUP:     { badge: "bg-green-100 text-green-700",   label: "Top-up" },
  CREDIT_GRANTED:   { badge: "bg-blue-100 text-blue-700",     label: "Credit granted" },
  REFUND_ISSUED:    { badge: "bg-emerald-100 text-emerald-700", label: "Refund" },
  USER_SUSPENDED:   { badge: "bg-red-100 text-red-700",       label: "Suspended" },
  USER_ACTIVATED:   { badge: "bg-green-100 text-green-700",   label: "Activated" },
  MODEL_CREATED:    { badge: "bg-amber-100 text-amber-700",   label: "Model created" },
  MODEL_UPDATED:    { badge: "bg-amber-100 text-amber-700",   label: "Model updated" },
  MODEL_DISABLED:   { badge: "bg-zinc-100 text-zinc-500",     label: "Model disabled" },
  PROVIDER_ENABLED: { badge: "bg-teal-100 text-teal-700",     label: "Provider enabled" },
  PROVIDER_DISABLED:{ badge: "bg-zinc-100 text-zinc-500",     label: "Provider disabled" },
};

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

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

function FilterSelect({
  value,
  onChange,
  children,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(
        "h-8 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring cursor-pointer",
        className
      )}
    >
      {children}
    </select>
  );
}

const PRESET_LABELS: { key: Preset; label: string }[] = [
  { key: "7d",     label: "7d" },
  { key: "30d",    label: "30d" },
  { key: "90d",    label: "90d" },
  { key: "custom", label: "Custom" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [preset, setPreset]           = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [typeFilter, setTypeFilter]   = useState("");
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  const summaryParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (activeProject?.id) p.projectId = activeProject.id;
    if (preset === "custom") {
      if (customStart) p.from = `${customStart}T00:00:00.000Z`;
      if (customEnd)   p.to   = `${customEnd}T23:59:59.000Z`;
      if (customStart && customEnd) p.dateRangePreset = "custom";
    } else {
      const MAP: Record<string, string> = { "7d": "past_7d", "30d": "past_30d", "90d": "past_30d" };
      p.dateRangePreset = MAP[preset] ?? "past_30d";
    }
    return p;
  }, [preset, customStart, customEnd, activeProject?.id]);

  useEffect(() => {
    setPage(1);
  }, [preset, customStart, customEnd, typeFilter, limit]);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, limit };
    if (activeProject?.id)      p.projectId  = activeProject.id;
    if (dateRange.startDate)    p.startDate  = dateRange.startDate;
    if (dateRange.endDate)      p.endDate    = dateRange.endDate;
    if (typeFilter)             p.activityType = typeFilter;
    return p;
  }, [page, limit, activeProject?.id, dateRange, typeFilter]);

  const { data, isLoading, isFetching, refetch } = useQuery<ActivityResponse>({
    queryKey: ["activity", queryParams],
    queryFn: () =>
      api.get("/activity", { params: queryParams }).then((r) => r.data),
    enabled: true,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<UsageSummaryResponse>({
    queryKey: ["usage-summary", summaryParams],
    queryFn: () =>
      api.get("/usage/summary", { params: summaryParams }).then((r) => r.data),
    enabled: !!summaryParams.dateRangePreset,
  });

  const logs       = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground/90 font-serif">Activity Log</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Audit trail of all actions in this project.
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => refetch()}
          aria-label="Refresh"
          className={cn(isFetching && "animate-spin")}
        >
          <RefreshCw className="size-4" />
        </Button>
      </motion.div>

      {/* Usage summary cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          {
            label: "Total Requests",
            value: summaryLoading
              ? null
              : (summary?.totals.totalRequests.toLocaleString() ?? "—"),
          },
          {
            label: "Success Rate",
            value: summaryLoading
              ? null
              : summary
              ? `${Math.round((summary.totals.successRequests / Math.max(summary.totals.totalRequests, 1)) * 100)}%`
              : "—",
          },
          {
            label: "Total Tokens",
            value: summaryLoading
              ? null
              : (summary?.totals.totalTokens.toLocaleString() ?? "—"),
          },
          {
            label: "Total Cost",
            value: summaryLoading
              ? null
              : summary?.totals.totalCost
              ? `$${parseFloat(summary.totals.totalCost).toFixed(4)}`
              : "—",
          },
        ].map(({ label, value }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm"
          >
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            {value === null ? (
              <Skeleton className="mt-1.5 h-6 w-20 rounded-lg" />
            ) : (
              <p className="mt-1 text-xl font-bold text-foreground">{value}</p>
            )}
          </div>
        ))}
      </motion.div>

      {/* Filter bar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end gap-3 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm">
        {/* Date presets */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Date range</span>
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
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          </>
        )}

        <div className="hidden h-8 w-px bg-border sm:block" />

        {/* Activity type filter */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Category</span>
          <FilterSelect value={typeFilter} onChange={setTypeFilter} className="w-40">
            <option value="">All activity</option>
            {Object.entries(ACTIVITY_GROUPS).map(([group, types]) => (
              <optgroup key={group} label={group}>
                {types.map((t) => (
                  <option key={t} value={t}>
                    {TYPE_STYLE[t].label}
                  </option>
                ))}
              </optgroup>
            ))}
          </FilterSelect>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
      {isLoading ? (
        <div className="space-y-2 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-border bg-muted/10 py-20 text-center shadow-sm backdrop-blur-sm">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50">
            <ActivityIcon className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground text-lg">No activity found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or date range.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-500 hover:shadow-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Event</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Details</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const config = TYPE_STYLE[log.activityType];
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          config.badge
                        )}
                      >
                        {config.label}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.entityType ? (
                        <span>
                          <span className="font-medium text-foreground">
                            {log.entityType}
                          </span>
                          {log.entityId && (
                            <span className="ml-1 font-mono text-xs">
                              {log.entityId.slice(0, 8)}…
                            </span>
                          )}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="max-w-xs text-xs text-muted-foreground truncate">
                      {log.metadata
                        ? Object.entries(log.metadata)
                            .slice(0, 2)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")
                        : "—"}
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {log.ipAddress ?? "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(log.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      </motion.div>

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {total.toLocaleString()}
            </span>{" "}
            results
          </p>
          <div className="flex items-center gap-2">
            <FilterSelect
              value={String(limit)}
              onChange={(v) => setLimit(Number(v))}
              className="w-24"
            >
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </FilterSelect>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
