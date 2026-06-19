"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Clock,
  Zap,
  DollarSign,
  Copy,
  Check,
  Activity,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";
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
import type { ApiKey } from "@/types";

// ── Local types ────────────────────────────────────────────────────────────────

type LogStatus = "SUCCESS" | "FAILED" | "PARTIAL" | "STOPPED";

interface UsageLogItem {
  id: string;
  createdAt: string;
  requestedModelSlug: string;
  resolvedModelSlug: string;
  model: {
    slug: string;
    displayName: string;
    provider: { slug: string; displayName: string };
  };
  apiKey: { name: string; keyPrefix: string; status: string };
  requestType: string;
  status: LogStatus;
  stream: boolean;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  totalCost: string;
  latencyMs: number;
  responseCompletionTimeMs: number;
}

interface UsageLogDetail extends UsageLogItem {
  finishReason?: string;
  errorMessage?: string;
  providerCost?: string;
  platformMarkupPercent?: string;
  platformMarkup?: string;
  requestPayload?: Record<string, unknown>;
  responseMetadata?: Record<string, unknown>;
}

interface UsageResponse {
  currentPage: number;
  pageSize: number;
  totalRecords: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  data: UsageLogItem[];
}

type Preset = "7d" | "30d" | "90d" | "custom";

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

function fmtTimestamp(ts: string) {
  return new Date(ts).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtLatency(ms: number | null | undefined) {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function fmtCost(usd: string | null | undefined) {
  if (usd == null) return "—";
  const n = parseFloat(usd);
  if (isNaN(n)) return "—";
  return n < 0.0001 ? "<$0.0001" : `$${n.toFixed(4)}`;
}

function fmtTokens(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function latencyColor(ms: number | null | undefined) {
  if (ms == null) return "text-muted-foreground";
  if (ms < 1000) return "text-emerald-600 dark:text-emerald-400";
  if (ms < 5000) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function costColor(usd: string | null | undefined) {
  if (usd == null) return "text-muted-foreground";
  const n = parseFloat(usd);
  if (isNaN(n) || n === 0) return "text-muted-foreground";
  if (n < 0.001) return "text-emerald-600 dark:text-emerald-400";
  if (n < 0.05) return "text-foreground";
  return "text-amber-600 dark:text-amber-400";
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  LogStatus,
  { dot: string; bg: string; text: string; label: string }
> = {
  SUCCESS: {
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 border border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
    label: "Success",
  },
  FAILED: {
    dot: "bg-red-500",
    bg: "bg-red-500/10 border border-red-500/20",
    text: "text-red-600 dark:text-red-400",
    label: "Failed",
  },
  PARTIAL: {
    dot: "bg-amber-500",
    bg: "bg-amber-500/10 border border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
    label: "Partial",
  },
  STOPPED: {
    dot: "bg-zinc-400",
    bg: "bg-zinc-500/10 border border-zinc-500/20",
    text: "text-zinc-500 dark:text-zinc-400",
    label: "Stopped",
  },
};

function StatusBadge({ status }: { status: LogStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none px-2.5 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.text
      )}
    >
      <span className={cn("size-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

// ── Capability badge ──────────────────────────────────────────────────────────

const CAPABILITY_CONFIG: Record<string, { bg: string; text: string }> = {
  CHAT: {
    bg: "bg-violet-500/10 border border-violet-500/20",
    text: "text-violet-600 dark:text-violet-400",
  },
  IMAGE: {
    bg: "bg-rose-500/10 border border-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
  },
  AUDIO: {
    bg: "bg-sky-500/10 border border-sky-500/20",
    text: "text-sky-600 dark:text-sky-400",
  },
  VIDEO: {
    bg: "bg-pink-500/10 border border-pink-500/20",
    text: "text-pink-600 dark:text-pink-400",
  },
  EMBEDDING: {
    bg: "bg-teal-500/10 border border-teal-500/20",
    text: "text-teal-600 dark:text-teal-400",
  },
};

function CapabilityBadge({ type }: { type: string }) {
  const cfg = CAPABILITY_CONFIG[type] ?? {
    bg: "bg-muted border border-border",
    text: "text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-none px-2 py-0.5 text-xs font-medium",
        cfg.bg,
        cfg.text
      )}
    >
      {type}
    </span>
  );
}

// ── Copy-to-clipboard button ──────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="ml-1.5 inline-flex items-center text-muted-foreground hover:text-foreground transition-colors"
    >
      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
    </button>
  );
}

// ── Styled native select ──────────────────────────────────────────────────────

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
        "h-8 rounded-none border border-border bg-background px-2.5 text-sm text-foreground outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring cursor-pointer",
        className
      )}
    >
      {children}
    </select>
  );
}

// ── Sortable table head ───────────────────────────────────────────────────────

function SortHead({
  col,
  label,
  current,
  order,
  onToggle,
  className,
}: {
  col: string;
  label: string;
  current: string;
  order: "asc" | "desc";
  onToggle: (col: string) => void;
  className?: string;
}) {
  const active = current === col;
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none group/sort transition-colors hover:text-foreground",
        "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
        className
      )}
      onClick={() => onToggle(col)}
    >
      <span
        className={cn(
          "flex items-center gap-1.5",
          className?.includes("text-right") && "justify-end"
        )}
      >
        {label}
        <span
          className={cn(
            "transition-opacity",
            active ? "opacity-100 text-primary" : "opacity-0 group-hover/sort:opacity-50"
          )}
        >
          {active ? (
            order === "asc" ? (
              <ArrowUp className="size-3" />
            ) : (
              <ArrowDown className="size-3" />
            )
          ) : (
            <ArrowUpDown className="size-3" />
          )}
        </span>
      </span>
    </TableHead>
  );
}

// ── Metric card for detail panel ──────────────────────────────────────────────

function MetricCard({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-none border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3" />
        {label}
      </div>
      <div className={cn("text-sm font-semibold text-foreground", valueClass)}>
        {value}
      </div>
    </div>
  );
}

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}

// ── Framer variants ───────────────────────────────────────────────────────────

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

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const activeProject = useProjectStore((s) => s.activeProject);
  const [preset, setPreset] = useState<Preset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [model, setModel] = useState("");
  const [status, setStatus] = useState("");
  const [capability, setCapability] = useState("");
  const [apiKeyId, setApiKeyId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showPayload, setShowPayload] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [sortBy, setSortBy] = useState("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const searchParams = useSearchParams();

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (requestId) setExpandedId(requestId);
  }, [searchParams]);

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  useEffect(() => {
    setPage(1);
  }, [preset, customStart, customEnd, model, status, apiKeyId, capability, limit]);

  useEffect(() => {
    setShowPayload(false);
    setShowResponse(false);
  }, [expandedId]);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, pageSize: limit };
    if (activeProject?.id) p.projectId = activeProject.id;
    if (preset === "custom") {
      if (dateRange.startDate) p.from = `${dateRange.startDate}T00:00:00.000Z`;
      if (dateRange.endDate) p.to = `${dateRange.endDate}T23:59:59.000Z`;
      if (dateRange.startDate && dateRange.endDate) p.dateRangePreset = "custom";
    } else {
      const PRESET_MAP: Record<string, string> = {
        "7d": "past_7d",
        "30d": "past_30d",
        "90d": "past_30d",
      };
      p.dateRangePreset = PRESET_MAP[preset] ?? "past_7d";
    }
    if (model) p.search = model;
    if (status) p.status = status;
    if (apiKeyId) p.apiKeyId = apiKeyId;
    if (capability) p.requestType = capability;
    if (sortBy) {
      const SORT_MAP: Record<string, string> = {
        timestamp: "createdAt",
        totalTokens: "totalTokens",
        costUsd: "totalCost",
      };
      p.sort = `${SORT_MAP[sortBy] ?? sortBy}:${sortOrder}`;
    }
    return p;
  }, [page, limit, preset, activeProject?.id, dateRange, model, status, apiKeyId, capability, sortBy, sortOrder]);

  const { data, isLoading, isFetching, refetch } = useQuery<UsageResponse>({
    queryKey: ["usage", queryParams],
    queryFn: () => api.get("/usage/logs", { params: queryParams }).then((r) => r.data),
    enabled: !!activeProject,
  });

  const { data: keys = [] } = useQuery<ApiKey[]>({
    queryKey: ["keys", activeProject?.id],
    queryFn: () =>
      api.get("/api-keys", { params: { projectId: activeProject!.id } }).then((r) => r.data),
    enabled: !!activeProject,
  });

  const { data: detail, isLoading: detailLoading } = useQuery<UsageLogDetail>({
    queryKey: ["usage-detail", expandedId],
    queryFn: () => api.get(`/usage/logs/${expandedId}`).then((r) => r.data),
    enabled: !!expandedId,
  });

  const logs = data?.data ?? [];
  const total = data?.totalRecords ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const toggleRow = (id: string) =>
    setExpandedId((prev) => (prev === id ? null : id));

  const PRESET_LABELS: { key: Preset; label: string }[] = [
    { key: "7d", label: "7d" },
    { key: "30d", label: "30d" },
    { key: "90d", label: "90d" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground/90">
            Usage Logs
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Inspect every API request made with your keys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            aria-label="Refresh"
            className={cn(
              "transition-all hover:bg-muted/50",
              isFetching && "animate-spin"
            )}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="transition-all hover:shadow-sm"
            onClick={() =>
              toast.info("Export coming soon", {
                description: "CSV / JSON export will be available in a future update.",
              })
            }
          >
            <Download className="size-4 mr-1.5" />
            Export
          </Button>
        </div>
      </motion.div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-end gap-3 rounded-none border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm"
      >
        {/* Date presets */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Date range</span>
          <div className="flex rounded-none border border-border overflow-hidden">
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

        {/* Custom date inputs */}
        {preset === "custom" && (
          <>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">From</span>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-8 rounded-none border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">To</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-8 rounded-none border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          </>
        )}

        <div className="hidden h-8 w-px bg-border sm:block" />

        {/* Model */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Model</span>
          <input
            type="text"
            placeholder="e.g. gpt-4o"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-8 w-36 rounded-none border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Status</span>
          <FilterSelect value={status} onChange={setStatus}>
            <option value="">All statuses</option>
            <option value="SUCCESS">Success</option>
            <option value="FAILED">Failed</option>
            <option value="PARTIAL">Partial</option>
            <option value="STOPPED">Stopped</option>
          </FilterSelect>
        </div>

        {/* Capability */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Capability</span>
          <FilterSelect value={capability} onChange={setCapability}>
            <option value="">All capabilities</option>
            <option value="CHAT">Chat</option>
            <option value="IMAGE">Image</option>
            <option value="AUDIO">Audio</option>
            <option value="VIDEO">Video</option>
            <option value="EMBEDDING">Embedding</option>
          </FilterSelect>
        </div>

        {/* API key */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">API key</span>
          <FilterSelect value={apiKeyId} onChange={setApiKeyId}>
            <option value="">All keys</option>
            {keys.map((k) => (
              <option key={k.id} value={k.id}>
                {k.name} ({k.keyPrefix})
              </option>
            ))}
          </FilterSelect>
        </div>
      </motion.div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="space-y-2 rounded-none border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-none" />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-none border border-dashed border-border bg-muted/10 py-24 text-center shadow-sm backdrop-blur-sm">
            <div className="flex size-16 items-center justify-center rounded-none bg-muted/50 ring-1 ring-border">
              <FileText className="size-7 text-muted-foreground" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-lg">No logs found</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Try adjusting your filters or date range.
              </p>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-none border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-500 hover:shadow-md">
            {/* Live indicator bar */}
            {isFetching && (
              <div className="h-0.5 w-full bg-gradient-to-r from-primary/0 via-primary to-primary/0 animate-pulse" />
            )}

            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                  {/* expand */}
                  <TableHead className="w-8" />
                  {/* request id */}
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground w-[110px]">
                    Request ID
                  </TableHead>
                  <SortHead
                    col="timestamp"
                    label="Timestamp"
                    current={sortBy}
                    order={sortOrder}
                    onToggle={toggleSort}
                    className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  />
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Model
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Key
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Type
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Prompt
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Completion
                  </TableHead>
                  <SortHead
                    col="totalTokens"
                    label="Total Tokens"
                    current={sortBy}
                    order={sortOrder}
                    onToggle={toggleSort}
                    className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  />
                  <SortHead
                    col="costUsd"
                    label="Cost"
                    current={sortBy}
                    order={sortOrder}
                    onToggle={toggleSort}
                    className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  />
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Latency
                  </TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {logs.map((log, idx) => {
                  const isExpanded = expandedId === log.id;
                  const isEven = idx % 2 === 0;
                  return (
                    <React.Fragment key={log.id}>
                      {/* ── Main row ── */}
                      <TableRow
                        aria-expanded={isExpanded}
                        onClick={() => toggleRow(log.id)}
                        className={cn(
                          "cursor-pointer border-b border-border/40 transition-colors duration-150 group/row",
                          isEven ? "bg-transparent" : "bg-muted/10",
                          isExpanded
                            ? "bg-primary/5 border-b-0"
                            : "hover:bg-accent/40"
                        )}
                      >
                        {/* expand chevron */}
                        <TableCell className="pl-4 pr-0 w-8">
                          <span
                            className={cn(
                              "flex items-center justify-center size-5 rounded-none transition-all duration-200",
                              isExpanded
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground group-hover/row:text-foreground group-hover/row:bg-muted/60"
                            )}
                          >
                            {isExpanded ? (
                              <ChevronDown className="size-3.5" />
                            ) : (
                              <ChevronRight className="size-3.5" />
                            )}
                          </span>
                        </TableCell>

                        {/* request id */}
                        <TableCell className="w-[110px]">
                          <span className="font-mono text-[11px] text-muted-foreground truncate block max-w-[100px]">
                            {log.id.slice(0, 8)}…
                          </span>
                        </TableCell>

                        {/* timestamp */}
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {fmtTimestamp(log.createdAt)}
                        </TableCell>

                        {/* model */}
                        <TableCell>
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-medium text-foreground truncate max-w-[140px]">
                              {log.model?.displayName ?? log.requestedModelSlug}
                            </span>
                            {log.model?.provider?.displayName && (
                              <span className="text-[10px] text-muted-foreground">
                                {log.model.provider.displayName}
                              </span>
                            )}
                          </div>
                        </TableCell>

                        {/* key prefix */}
                        <TableCell>
                          <span className="font-mono text-[11px] bg-muted/60 border border-border/60 rounded-none px-1.5 py-0.5 text-muted-foreground">
                            {log.apiKey?.keyPrefix ?? "—"}
                          </span>
                        </TableCell>

                        {/* capability */}
                        <TableCell>
                          <CapabilityBadge type={log.requestType} />
                        </TableCell>

                        {/* status */}
                        <TableCell>
                          <StatusBadge status={log.status} />
                        </TableCell>

                        {/* prompt tokens */}
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                          {fmtTokens(log.promptTokens)}
                        </TableCell>

                        {/* completion tokens */}
                        <TableCell className="text-right tabular-nums text-xs text-muted-foreground">
                          {fmtTokens(log.completionTokens)}
                        </TableCell>

                        {/* total tokens */}
                        <TableCell className="text-right tabular-nums text-xs font-medium text-foreground">
                          {fmtTokens(log.totalTokens)}
                        </TableCell>

                        {/* cost */}
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-xs font-semibold",
                            costColor(log.totalCost)
                          )}
                        >
                          {fmtCost(log.totalCost)}
                        </TableCell>

                        {/* latency */}
                        <TableCell
                          className={cn(
                            "text-right tabular-nums text-xs font-medium",
                            latencyColor(log.latencyMs)
                          )}
                        >
                          {fmtLatency(log.latencyMs)}
                        </TableCell>
                      </TableRow>

                      {/* ── Expanded detail panel ── */}
                      <AnimatePresence initial={false}>
                        {isExpanded && (
                          <tr className="border-b border-border/60 bg-primary/3">
                            <td colSpan={12} className="p-0">
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.22, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="px-6 py-5 space-y-5 border-t border-primary/10 bg-gradient-to-b from-primary/5 to-transparent">
                                  {detailLoading ? (
                                    <div className="grid grid-cols-4 gap-3">
                                      {Array.from({ length: 4 }).map((_, i) => (
                                        <Skeleton key={i} className="h-16 rounded-xl" />
                                      ))}
                                    </div>
                                  ) : (
                                    <>
                                      {/* ── Metric cards ── */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <MetricCard
                                          icon={Activity}
                                          label="Total Tokens"
                                          value={fmtTokens(log.totalTokens)}
                                        />
                                        <MetricCard
                                          icon={DollarSign}
                                          label="Total Cost"
                                          value={fmtCost(log.totalCost)}
                                          valueClass={costColor(log.totalCost)}
                                        />
                                        <MetricCard
                                          icon={Clock}
                                          label="Latency"
                                          value={fmtLatency(log.latencyMs)}
                                          valueClass={latencyColor(log.latencyMs)}
                                        />
                                        <MetricCard
                                          icon={Zap}
                                          label="Finish Reason"
                                          value={detail?.finishReason ?? "—"}
                                        />
                                      </div>

                                      {/* ── Detail grid ── */}
                                      <div className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-3 rounded-xl border border-border/50 bg-background/60 p-4">
                                        <DetailRow
                                          label="Request ID"
                                          value={
                                            <span className="font-mono text-xs break-all flex items-center">
                                              {detail?.id ?? log.id}
                                              <CopyButton text={detail?.id ?? log.id} />
                                            </span>
                                          }
                                        />
                                        <DetailRow
                                          label="Timestamp"
                                          value={new Date(log.createdAt).toLocaleString()}
                                        />
                                        <DetailRow
                                          label="Model"
                                          value={
                                            <span className="font-mono text-xs">
                                              {log.model?.displayName ?? log.requestedModelSlug}
                                            </span>
                                          }
                                        />
                                        <DetailRow
                                          label="Provider"
                                          value={log.model?.provider?.displayName ?? "—"}
                                        />
                                        <DetailRow
                                          label="API Key"
                                          value={
                                            <span className="font-mono text-xs bg-muted border border-border rounded px-1.5 py-0.5">
                                              {log.apiKey?.keyPrefix ?? "—"}
                                            </span>
                                          }
                                        />
                                        <DetailRow
                                          label="Streaming"
                                          value={log.stream ? "Yes" : "No"}
                                        />
                                        <DetailRow
                                          label="Prompt Tokens"
                                          value={fmtTokens(log.promptTokens)}
                                        />
                                        <DetailRow
                                          label="Completion Tokens"
                                          value={fmtTokens(log.completionTokens)}
                                        />
                                        <DetailRow
                                          label="Total Tokens"
                                          value={fmtTokens(log.totalTokens)}
                                        />

                                        {(detail?.errorMessage || log.status === "FAILED") && (
                                          <div className="sm:col-span-2 lg:col-span-3">
                                            <DetailRow
                                              label="Error"
                                              value={
                                                <span className="text-red-600 dark:text-red-400 text-xs leading-relaxed">
                                                  {detail?.errorMessage ?? "Request failed"}
                                                </span>
                                              }
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* ── Cost breakdown ── */}
                                      {/* <div className="rounded-xl border border-border/50 bg-background/60 p-4">
                                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                          <DollarSign className="size-3" />
                                          Cost Breakdown
                                        </p>
                                        <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-3">
                                          <DetailRow
                                            label="Provider Cost"
                                            value={fmtCost(detail?.providerCost ?? log.totalCost)}
                                          />
                                          <DetailRow
                                            label="Platform Markup"
                                            value={
                                              detail?.platformMarkupPercent
                                                ? `${detail.platformMarkupPercent}% → ${fmtCost(detail.platformMarkup ?? "0")}`
                                                : "—"
                                            }
                                          />
                                          <DetailRow
                                            label="Total Charged"
                                            value={
                                              <span className="font-bold text-foreground">
                                                {fmtCost(log.totalCost)}
                                              </span>
                                            }
                                          />
                                        </div>
                                      </div> */}

                                      {/* ── Request payload ── */}
                                      {detail?.requestPayload && (
                                        <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowPayload((v) => !v);
                                            }}
                                            className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 transition-colors"
                                          >
                                            {showPayload ? (
                                              <ChevronDown className="size-3.5" />
                                            ) : (
                                              <ChevronRight className="size-3.5" />
                                            )}
                                            Request Payload
                                          </button>
                                          <AnimatePresence initial={false}>
                                            {showPayload && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="overflow-hidden"
                                              >
                                                <pre className="max-h-64 overflow-auto border-t border-border/60 px-4 py-3 text-xs text-foreground font-mono leading-relaxed bg-muted/20">
                                                  {JSON.stringify(detail.requestPayload, null, 2)}
                                                </pre>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      )}

                                      {/* ── Response metadata ── */}
                                      {detail?.responseMetadata && (
                                        <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setShowResponse((v) => !v);
                                            }}
                                            className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:bg-muted/40 transition-colors"
                                          >
                                            {showResponse ? (
                                              <ChevronDown className="size-3.5" />
                                            ) : (
                                              <ChevronRight className="size-3.5" />
                                            )}
                                            Response Metadata
                                          </button>
                                          <AnimatePresence initial={false}>
                                            {showResponse && (
                                              <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.18 }}
                                                className="overflow-hidden"
                                              >
                                                <pre className="max-h-64 overflow-auto border-t border-border/60 px-4 py-3 text-xs text-foreground font-mono leading-relaxed bg-muted/20">
                                                  {JSON.stringify(detail.responseMetadata, null, 2)}
                                                </pre>
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {!isLoading && total > 0 && (
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-semibold text-foreground">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-foreground">{total.toLocaleString()}</span>{" "}
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
                className="rounded-xl"
              >
                Previous
              </Button>

              {/* Page number pills */}
              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "size-8 rounded-xl text-sm font-medium transition-colors",
                        page === p
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-accent text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <span className="text-muted-foreground text-sm px-1">…</span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl"
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
