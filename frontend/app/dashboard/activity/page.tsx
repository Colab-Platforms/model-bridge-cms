"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Activity,
  Zap,
  Clock,
  DollarSign,
  Layers,
  BarChart3,
  PieChart,
  History,
  ChevronDown,
  Search,
  Plus,
  SlidersHorizontal,
  Check,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Pie,
  Cell,
  PieChart as RechartsPieChart,
  Tooltip,
} from "recharts";

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
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardAction,
  CardFooter,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import LineGraph from "@/components/charts/line-graph";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UsageSummaryResponse {
  range: { from: string; to: string };
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

interface TimeseriesBucket {
  bucket: string;
  requests: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: string;
}

interface UsageTimeseriesResponse {
  range: { from: string; to: string };
  granularity: string;
  series: TimeseriesBucket[];
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

const TYPE_STYLE: Record<ActivityType, { color: string; label: string; icon: React.ElementType }> = {
  USER_REGISTERED:  { color: "text-emerald-500 bg-emerald-500/10",   label: "Registered",       icon: Plus },
  USER_LOGIN:       { color: "text-blue-500 bg-blue-500/10",         label: "Login",             icon: Activity },
  USER_LOGOUT:      { color: "text-zinc-500 bg-zinc-500/10",         label: "Logout",            icon: Activity },
  PROJECT_CREATED:  { color: "text-violet-500 bg-violet-500/10",     label: "Project created",   icon: Layers },
  PROJECT_UPDATED:  { color: "text-violet-500 bg-violet-500/10",     label: "Project updated",   icon: Layers },
  PROJECT_DELETED:  { color: "text-red-500 bg-red-500/10",           label: "Project deleted",   icon: Layers },
  API_KEY_CREATED:  { color: "text-indigo-500 bg-indigo-500/10",     label: "Key created",       icon: Zap },
  API_KEY_UPDATED:  { color: "text-indigo-500 bg-indigo-500/10",     label: "Key updated",       icon: Zap },
  API_KEY_REVOKED:  { color: "text-red-500 bg-red-500/10",           label: "Key revoked",       icon: Zap },
  WALLET_TOPUP:     { color: "text-emerald-500 bg-emerald-500/10",   label: "Top-up",            icon: DollarSign },
  CREDIT_GRANTED:   { color: "text-blue-500 bg-blue-500/10",         label: "Credit granted",    icon: DollarSign },
  REFUND_ISSUED:    { color: "text-emerald-500 bg-emerald-500/10",   label: "Refund",            icon: DollarSign },
  USER_SUSPENDED:   { color: "text-red-500 bg-red-500/10",           label: "Suspended",         icon: Activity },
  USER_ACTIVATED:   { color: "text-emerald-500 bg-emerald-500/10",   label: "Activated",         icon: Activity },
  MODEL_CREATED:    { color: "text-amber-500 bg-amber-500/10",       label: "Model created",     icon: Zap },
  MODEL_UPDATED:    { color: "text-amber-500 bg-amber-500/10",       label: "Model updated",     icon: Zap },
  MODEL_DISABLED:   { color: "text-zinc-500 bg-zinc-500/10",         label: "Model disabled",    icon: Zap },
  PROVIDER_ENABLED: { color: "text-teal-500 bg-teal-500/10",         label: "Provider enabled",  icon: Layers },
  PROVIDER_DISABLED:{ color: "text-zinc-500 bg-zinc-500/10",         label: "Provider disabled", icon: Layers },
};

const PERIOD_OPTIONS = [
  { key: "7d",     short: "7d",   label: "Past 7 Days"    },
  { key: "30d",    short: "30d",  label: "Past 30 Days"   },
  { key: "90d",    short: "90d",  label: "Past 3 Months"  },
  { key: "custom", short: "—",    label: "Custom Range"   },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

function presetDates(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    startDate: start.toISOString().split("T")[0],
    endDate:   end.toISOString().split("T")[0],
  };
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function fmtChartDate(ts: string) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short", day: "numeric",
  });
}

function useClickOutside(ref: React.RefObject<HTMLElement | null>, cb: () => void) {
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) cb();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, cb]);
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -6, scale: 0.97 },
  show:   { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.12 } },
  exit:   { opacity: 0, y: -6, scale: 0.97, transition: { duration: 0.1  } },
};

// ── PeriodPicker ──────────────────────────────────────────────────────────────

function PeriodPicker({
  preset,
  onSelect,
  customStart,
  customEnd,
  onCustomChange,
}: {
  preset: Preset;
  onSelect: (p: Preset) => void;
  customStart: string;
  customEnd: string;
  onCustomChange: (field: "start" | "end", val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const current = PERIOD_OPTIONS.find(p => p.key === preset)!;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 rounded-xl border border-border/60 bg-card px-3 py-1.5 text-sm shadow-xs transition-colors hover:bg-muted/50"
      >
        <span className="font-semibold tabular-nums text-foreground">{current.short}</span>
        <span className="hidden text-muted-foreground sm:inline">{current.label}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform duration-150", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-border/50 bg-popover shadow-xl ring-1 ring-foreground/5"
          >
            {PERIOD_OPTIONS.map(p => (
              <button
                key={p.key}
                onClick={() => {
                  onSelect(p.key as Preset);
                  if (p.key !== "custom") setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/60",
                  preset === p.key && "bg-primary/5 text-primary"
                )}
              >
                <span className="w-8 text-xs font-semibold tabular-nums">{p.short}</span>
                <span className={preset === p.key ? "font-medium" : "text-muted-foreground"}>{p.label}</span>
                {preset === p.key && <Check className="ml-auto size-3.5" />}
              </button>
            ))}
            {preset === "custom" && (
              <div className="space-y-2 border-t border-border/40 px-4 py-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={e => onCustomChange("start", e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={e => onCustomChange("end", e.target.value)}
                    className="h-8 w-full rounded-lg border border-border bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── FilterPanel ───────────────────────────────────────────────────────────────

function FilterPanel({
  filterMode,
  onFilterModeChange,
  selectedTypes,
  onToggleType,
  onClear,
}: {
  filterMode: "include" | "exclude";
  onFilterModeChange: (m: "include" | "exclude") => void;
  selectedTypes: Set<ActivityType>;
  onToggleType: (t: ActivityType) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setOpen(false));

  const allCategories = Object.keys(ACTIVITY_GROUPS);

  const filteredItems = useMemo(() => {
    const groups: [string, ActivityType[]][] = category
      ? [[category, ACTIVITY_GROUPS[category] ?? []]]
      : (Object.entries(ACTIVITY_GROUPS) as [string, ActivityType[]][]);

    return groups.flatMap(([grp, types]) =>
      types
        .filter(t => {
          if (!search) return true;
          const lbl = TYPE_STYLE[t].label.toLowerCase();
          return lbl.includes(search.toLowerCase()) || t.toLowerCase().includes(search.toLowerCase());
        })
        .map(t => ({ type: t, group: grp, label: TYPE_STYLE[t].label }))
    );
  }, [category, search]);

  const count = selectedTypes.size;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={cn(
          "flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm shadow-xs transition-colors",
          count > 0
            ? "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10"
            : "border-border/60 bg-card text-foreground hover:bg-muted/50"
        )}
      >
        <SlidersHorizontal className="size-3.5" />
        <span>Filters</span>
        {count > 0 && (
          <span className="flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {count}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="show"
            exit="exit"
            className="absolute left-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-border/50 bg-popover shadow-xl ring-1 ring-foreground/5"
          >
            {/* Include / Exclude tabs */}
            <div className="flex border-b border-border/40">
              {(["include", "exclude"] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => onFilterModeChange(mode)}
                  className={cn(
                    "flex-1 py-2.5 text-xs font-semibold capitalize transition-colors",
                    filterMode === mode
                      ? "bg-muted/40 text-foreground border-b-2 border-primary -mb-px"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/20"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="px-3 pt-3 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search event types..."
                  autoFocus
                  className="h-8 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            {/* Category chips */}
            <div className="flex flex-wrap gap-1.5 px-3 pb-3">
              <button
                onClick={() => setCategory("")}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  !category
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                All
              </button>
              {allCategories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(prev => prev === cat ? "" : cat)}
                  className={cn(
                    "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                    category === cat
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/40 bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="mx-3 h-px bg-border/40" />

            {/* Event type checklist */}
            <div className="max-h-56 overflow-y-auto py-1">
              {filteredItems.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">No event types found</p>
              ) : (
                filteredItems.map(({ type, label }) => {
                  const selected = selectedTypes.has(type);
                  const style = TYPE_STYLE[type];
                  const Icon = style.icon;
                  return (
                    <button
                      key={type}
                      onClick={() => onToggleType(type)}
                      className="flex w-full items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
                    >
                      <span className={cn(
                        "flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                        selected ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent"
                      )}>
                        {selected && <Check className="size-2.5" />}
                      </span>
                      <span className={cn("flex size-6 shrink-0 items-center justify-center rounded-md text-[10px]", style.color)}>
                        <Icon className="size-3" />
                      </span>
                      <span className={cn("text-sm", selected ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {label}
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Footer: clear */}
            {count > 0 && (
              <div className="border-t border-border/40 p-3">
                <button
                  onClick={() => { onClear(); setOpen(false); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-border/50 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground"
                >
                  <X className="size-3" />
                  Clear {count} filter{count > 1 ? "s" : ""}
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── MetricCard ────────────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  icon: Icon,
  description,
  isLoading,
}: {
  label: string;
  value: string | number | null;
  icon: React.ElementType;
  description?: string;
  isLoading?: boolean;
}) {
  return (
    <Card className="@container/card bg-gradient-to-t from-primary/5 to-card shadow-xs">
      <CardHeader>
        <CardDescription className="flex items-center gap-2">
          <span className="inline-flex size-6 items-center justify-center rounded-md bg-primary/8 text-primary">
            <Icon className="size-3.5" />
          </span>
          {label}
        </CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {isLoading ? <Skeleton className="h-8 w-28 rounded-lg" /> : (value ?? "—")}
        </CardTitle>
      </CardHeader>
      {description && (
        <CardFooter className="text-xs text-muted-foreground">{description}</CardFooter>
      )}
    </Card>
  );
}

// ── ChartSection ──────────────────────────────────────────────────────────────

function ChartSection({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-3.5" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="h-[280px]">{children}</CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const activeProject = useProjectStore((s) => s.activeProject);

  // Period state
  const [preset, setPreset]           = useState<Preset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");

  // Filter state (OpenRouter-style)
  const [filterMode, setFilterMode]       = useState<"include" | "exclude">("include");
  const [selectedTypes, setSelectedTypes] = useState<Set<ActivityType>>(new Set());

  // Pagination
  const [page, setPage]   = useState(1);
  const [limit, setLimit] = useState(20);

  useEffect(() => { setPage(1); }, [preset, customStart, customEnd, selectedTypes, limit]);

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  const apiParams = useMemo(() => {
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

  // ── Queries ────────────────────────────────────────────────────────────────

  const {
    data: activityData,
    isLoading: activityLoading,
    isFetching: activityFetching,
    refetch: refetchActivity,
  } = useQuery<ActivityResponse>({
    queryKey: ["activity", { page, limit, ...apiParams }],
    queryFn: () =>
      api.get("/activity", { params: { page, limit, ...apiParams } }).then((r) => r.data),
    enabled: true,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery<UsageSummaryResponse>({
    queryKey: ["usage-summary", apiParams],
    queryFn: () => api.get("/usage/summary", { params: apiParams }).then((r) => r.data),
    enabled: !!apiParams.dateRangePreset,
  });

  const { data: timeseries } = useQuery<UsageTimeseriesResponse>({
    queryKey: ["usage-timeseries", { ...apiParams, granularity: preset === "7d" ? "hour" : "day" }],
    queryFn: () =>
      api.get("/usage/timeseries", {
        params: { ...apiParams, granularity: preset === "7d" ? "hour" : "day" },
      }).then((r) => r.data),
    enabled: !!apiParams.dateRangePreset,
  });

  // ── Client-side filter ─────────────────────────────────────────────────────

  const allLogs = activityData?.data ?? [];

  const filteredLogs = useMemo(() => {
    if (selectedTypes.size === 0) return allLogs;
    if (filterMode === "include") return allLogs.filter(l => selectedTypes.has(l.activityType));
    return allLogs.filter(l => !selectedTypes.has(l.activityType));
  }, [allLogs, selectedTypes, filterMode]);

  const paginatedLogs = useMemo(
    () => filteredLogs.slice((page - 1) * limit, page * limit),
    [filteredLogs, page, limit]
  );
  const total      = filteredLogs.length;
  const totalPages = Math.ceil(total / limit);

  // ── Chart data ─────────────────────────────────────────────────────────────

  const requestChartConfig: ChartConfig = {
    requests: { label: "Requests", color: "hsl(var(--primary))" },
  };

  const statusPieData = useMemo(() => {
    if (!summary) return [];
    const t = summary.totals;
    return [
      { name: "Success", value: t.successRequests,  color: "#10b981" },
      { name: "Failed",  value: t.failedRequests,   color: "#ef4444" },
      { name: "Partial", value: t.partialRequests,  color: "#f59e0b" },
      { name: "Stopped", value: t.stoppedRequests,  color: "#71717a" },
    ].filter(d => d.value > 0);
  }, [summary]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  function toggleType(t: ActivityType) {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  }

  const activeFilterLabel = useMemo(() => {
    if (selectedTypes.size === 0) return null;
    const mode = filterMode === "include" ? "Showing" : "Hiding";
    const noun = selectedTypes.size === 1 ? "type" : "types";
    return `${mode} ${selectedTypes.size} event ${noun}`;
  }, [selectedTypes, filterMode]);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-8"
    >
      {/* ── Page Header ── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-foreground font-serif">Activity</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Audit trail for{" "}
            <span className="font-medium text-foreground">
              {activeProject?.name ?? "all projects"}
            </span>
          </p>
        </div>

        {/* Controls: Refresh + Filter + Period */}
        <div className="flex items-center gap-2 sm:mt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchActivity()}
            className="h-8 gap-1.5 rounded-xl border-border/60 bg-card text-xs"
          >
            <RefreshCw className={cn("size-3.5", activityFetching && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>

          <FilterPanel
            filterMode={filterMode}
            onFilterModeChange={setFilterMode}
            selectedTypes={selectedTypes}
            onToggleType={toggleType}
            onClear={() => setSelectedTypes(new Set())}
          />

          <PeriodPicker
            preset={preset}
            onSelect={setPreset}
            customStart={customStart}
            customEnd={customEnd}
            onCustomChange={(field, val) =>
              field === "start" ? setCustomStart(val) : setCustomEnd(val)
            }
          />
        </div>
      </motion.div>

      {/* Active filter indicator */}
      <AnimatePresence>
        {activeFilterLabel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-2"
          >
            <span className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <SlidersHorizontal className="size-3" />
              {activeFilterLabel}
            </span>
            <button
              onClick={() => setSelectedTypes(new Set())}
              className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
            >
              clear
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── KPI Cards ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Total Requests"
          value={summary?.totals.totalRequests.toLocaleString() ?? null}
          icon={Activity}
          isLoading={summaryLoading}
          description="Inbound API calls"
        />
        <MetricCard
          label="Total Cost"
          value={summary?.totals.totalCost ? `$${parseFloat(summary.totals.totalCost).toFixed(4)}` : null}
          icon={DollarSign}
          isLoading={summaryLoading}
          description="Total spending this period"
        />
        <MetricCard
          label="Total Tokens"
          value={summary?.totals.totalTokens.toLocaleString() ?? null}
          icon={Layers}
          isLoading={summaryLoading}
          description="Prompt + completion"
        />
        <MetricCard
          label="Avg Latency"
          value={summary?.totals.averageLatencyMs ? `${Math.round(summary.totals.averageLatencyMs)}ms` : null}
          icon={Clock}
          isLoading={summaryLoading}
          description="Average response time"
        />
      </motion.div>

      {/* ── Charts ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <ChartSection title="Requests Over Time" icon={BarChart3} className="lg:col-span-8">
          <ChartContainer config={requestChartConfig} className="h-full w-full">
            <BarChart
              data={timeseries?.series ?? []}
              margin={{ top: 8, right: 8, left: -20, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="bucket"
                tickFormatter={fmtChartDate}
                axisLine={false}
                tickLine={false}
                fontSize={11}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={11}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
              />
              <ChartTooltip content={<ChartTooltipContent hideLabel />} />
              <Bar dataKey="requests" fill="var(--color-requests)" radius={[6, 6, 0, 0]} barSize={28} />
            </BarChart>
          </ChartContainer>
        </ChartSection>

        <ChartSection title="Status Distribution" icon={PieChart} className="lg:col-span-4">
          <div className="flex h-full flex-col items-center justify-center gap-4">
            <ResponsiveContainer width="100%" height={180}>
              <RechartsPieChart>
                <Pie
                  data={statusPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={72}
                  paddingAngle={4}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <div className="rounded-xl bg-popover px-3 py-2 text-xs font-semibold shadow-lg ring-1 ring-border">
                        {payload[0].name}: {payload[0].value}
                      </div>
                    ) : null
                  }
                />
              </RechartsPieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              {statusPieData.map(item => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-[11px] text-muted-foreground">{item.name}</span>
                  <span className="ml-auto text-[11px] font-semibold tabular-nums">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </ChartSection>

        <div className="lg:col-span-12">
          <LineGraph
            data={timeseries?.series ?? []}
            subtitle={`${dateRange.startDate} – ${dateRange.endDate}`}
          />
        </div>
      </motion.div>

      {/* ── Audit Table ── */}
      <motion.div variants={itemVariants} className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <History className="size-4 text-primary" />
          <h3 className="text-lg font-semibold tracking-tight text-foreground font-serif">
            Audit Trail
          </h3>
          {total > 0 && (
            <Badge variant="secondary" className="ml-1 tabular-nums">
              {total.toLocaleString()}
            </Badge>
          )}
        </div>

        {activityLoading ? (
          <Card>
            <CardContent className="space-y-3 py-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" />
              ))}
            </CardContent>
          </Card>
        ) : paginatedLogs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center gap-4 py-20 text-center">
              <div className="flex size-16 items-center justify-center rounded-2xl bg-muted/50">
                <History className="size-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">No activities found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {selectedTypes.size > 0
                    ? "Try adjusting your event type filters."
                    : "No audit events in this period."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/40 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="py-3 pl-6 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Category</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Action</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Entity</TableHead>
                  <TableHead className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Details</TableHead>
                  <TableHead className="pr-6 text-right text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedLogs.map(log => {
                  const style = TYPE_STYLE[log.activityType] ?? {
                    color: "bg-zinc-500/10 text-zinc-500",
                    label: log.activityType,
                    icon: Activity,
                  };
                  const Icon = style.icon;
                  return (
                    <TableRow key={log.id} className="group/row border-b border-border/20 transition-colors hover:bg-primary/5">
                      <TableCell className="pl-6">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold",
                          style.color
                        )}>
                          <Icon className="size-3" />
                          {style.label}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-foreground">
                          {log.activityType.split("_").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" ")}
                        </span>
                      </TableCell>
                      <TableCell>
                        {log.entityType ? (
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-foreground/80">{log.entityType}</span>
                            {log.entityId && (
                              <span className="font-mono text-[10px] text-muted-foreground">
                                {log.entityId.split("-")[0]}…
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[260px]">
                        <div className="flex flex-wrap gap-1.5">
                          {log.metadata
                            ? Object.entries(log.metadata)
                                .slice(0, 3)
                                .map(([k, v]) => (
                                  <span key={k} className="rounded-md border border-border/20 bg-muted/40 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                    <span className="font-semibold">{k}:</span> {String(v)}
                                  </span>
                                ))
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="pr-6 text-right text-[11px] font-medium text-muted-foreground whitespace-nowrap">
                        {fmtDate(log.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Pagination */}
        {!activityLoading && total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">{total.toLocaleString()}</span>
            </p>
            <div className="flex items-center gap-2">
              <select
                value={String(limit)}
                onChange={e => setLimit(Number(e.target.value))}
                className="h-8 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
                <option value="100">100 / page</option>
              </select>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-xl"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-xl"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
