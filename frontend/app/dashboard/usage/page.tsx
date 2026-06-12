"use client";

import React, { useState, useEffect, useMemo } from "react";
import {useSearchParams} from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/projectStore";
import type { ApiKey } from "@/types";

// ── Local types for this endpoint ─────────────────────────────────────────────

type LogStatus = "SUCCESS" | "FAILED" | "PARTIAL" | "STOPPED";

interface UsageLogItem {
  id: string;
  createdAt: string;
  requestedModelSlug: string;
  resolvedModelSlug: string;
  model: {
    slug: string;
    displayName: string;
    provider: {
      slug: string;
      displayName: string;
    };
  };
  apiKey: {
    name: string;
    keyPrefix: string;
    status: string;
  };
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



// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LogStatus, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  STOPPED: "bg-zinc-100 text-zinc-500",
};

function StatusBadge({ status }: { status: LogStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STATUS_STYLES[status]
      )}
    >
      {status}
    </span>
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
        "h-8 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring",
        "cursor-pointer",
        className
      )}
    >
      {children}
    </select>
  );
}

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
  if (requestId) {
    // expand the matching row directly if visible,
    // or at minimum pass it as a filter to the query
    setExpandedId(requestId);
  }
}, [searchParams]);


  // Compute effective date range
  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  // toggle sort order or change sort field
  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };


  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [preset, customStart, customEnd, model, status, apiKeyId, capability, limit]);

  // Reset JSON panel visibility when a different row is expanded
  useEffect(() => {
    setShowPayload(false);
    setShowResponse(false);
  }, [expandedId]);



  // Build query params (omit blanks)
  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, pageSize: limit };
    if (activeProject?.id) p.projectId = activeProject.id;

    // Date range — map presets to backend values
    if (preset === "custom") {
      if (dateRange.startDate) p.from = `${dateRange.startDate}T00:00:00.000Z`;
      if (dateRange.endDate)   p.to   = `${dateRange.endDate}T23:59:59.000Z`;
      if (dateRange.startDate && dateRange.endDate) p.dateRangePreset = "custom";
    } else {
      const PRESET_MAP: Record<string, string> = { "7d": "past_7d", "30d": "past_30d", "90d": "past_30d" };
      p.dateRangePreset = PRESET_MAP[preset] ?? "past_7d";
    }

    if (model)      p.search      = model;       // free-text search (model slug, key name, etc.)
    if (status)     p.status      = status;
    if (apiKeyId)   p.apiKeyId    = apiKeyId;
    if (capability) p.requestType = capability;  // capability → requestType

    // Sort: single param in format "field:order"
    if (sortBy) {
      const SORT_MAP: Record<string, string> = {
        timestamp:   "createdAt",
        totalTokens: "totalTokens",
        costUsd:     "totalCost",
      };
      p.sort = `${SORT_MAP[sortBy] ?? sortBy}:${sortOrder}`;
    }

    return p;
  }, [page, limit, preset, activeProject?.id, dateRange, model, status, apiKeyId, capability, sortBy, sortOrder]);

  // Usage logs query
  const { data, isLoading, isFetching, refetch } = useQuery<UsageResponse>({
    queryKey: ["usage", queryParams],
    queryFn: () =>
      api.get("/usage/logs", { params: queryParams }).then((r) => r.data),
    enabled: !!activeProject,
  });

  // API keys for the filter dropdown
  const { data: keys = [] } = useQuery<ApiKey[]>({
    queryKey: ["keys", activeProject?.id],
    queryFn: () =>
      api.get("/api-keys", { params: { projectId: activeProject!.id } }).then((r) => r.data),
    enabled: !!activeProject,
  });

  // Detail fetch for expanded row
  const { data: detail, isLoading: detailLoading } = useQuery<UsageLogDetail>({
    queryKey: ["usage-detail", expandedId],
    queryFn: () =>
      api.get(`/usage/logs/${expandedId}`).then((r) => r.data),
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

  // ── Detail row component ─────────────────────────────────────────────────────
  function SortHead({ col, label, current, order, onToggle, className }: {
    col: string; label: string; current: string;
    order: "asc" | "desc"; onToggle: (col: string) => void;
    className?: string;
  }) {
    const active = current === col;
    return (
      <TableHead
        className={cn("cursor-pointer select-none", className)}
        onClick={() => onToggle(col)}
      >
        <span className={cn("flex items-center gap-1", className?.includes("text-right") && "justify-end")}>
          {label}
          <span className="text-muted-foreground">
            {active ? (order === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </span>
      </TableHead>
    );
  }


  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page header */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground/90 font-serif">Usage Logs</h2>
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
            className={cn("transition-all hover:bg-muted/50", isFetching && "animate-spin")}
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

      {/* Filter bar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end gap-3 rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm">
        {/* Date presets */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Date range
          </span>
          <div className="flex rounded-xl border border-border overflow-hidden">
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

        {/* Divider */}
        <div className="hidden h-8 w-px bg-border sm:block" />

        {/* Model */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Model
          </span>
          <input
            type="text"
            placeholder="e.g. gpt-4o"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-8 w-36 rounded-xl border border-border bg-background px-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
          <span className="text-xs font-medium text-muted-foreground">
            API key
          </span>
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
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground text-lg">No logs found</p>
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
                <TableHead className="w-8" />
                <TableHead>Request ID</TableHead>
                <SortHead col="timestamp"   label="Timestamp" current={sortBy} order={sortOrder} onToggle={toggleSort} />
                <TableHead>Model</TableHead>
                <TableHead>Key</TableHead>
                <TableHead>Capability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Prompt</TableHead>
                <TableHead className="text-right">Completion</TableHead>
                <SortHead col="totalTokens" label="Total"     current={sortBy} order={sortOrder} onToggle={toggleSort} className="text-right" />
                <SortHead col="costUsd"     label="Cost"      current={sortBy} order={sortOrder} onToggle={toggleSort} className="text-right" />
                <TableHead className="text-right">Latency</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <React.Fragment key={log.id}>
                    <TableRow
                      aria-expanded={isExpanded}
                      className="cursor-pointer"
                      onClick={() => toggleRow(log.id)}
                    >
                      {/* Expand chevron */}
                      <TableCell className="pl-3 pr-0">
                        {isExpanded ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">
                        {log.id}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {fmtTimestamp(log.createdAt)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.model?.displayName ?? log.requestedModelSlug}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.apiKey?.keyPrefix}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {log.requestType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={log.status} />
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmtTokens(log.promptTokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmtTokens(log.completionTokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmtTokens(log.totalTokens)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {fmtCost(log.totalCost)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmtLatency(log.latencyMs)}
                      </TableCell>
                    </TableRow>


                    {/* Inline detail panel */}
                    {isExpanded && (
                      <tr className="border-b border-border bg-muted/30">
                        <td colSpan={12} className="px-6 py-5 space-y-5">
                          {detailLoading ? (
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-64" />
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-4 w-56" />
                            </div>
                          ) : (
                            <>
                              {/* ── Summary grid ── */}
                              <div className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                                <DetailRow
                                  label="Request ID"
                                  value={
                                    <span className="font-mono text-xs break-all">
                                      {detail?.id ?? log.id}
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
                                  label="Prompt tokens"
                                  value={fmtTokens(log.promptTokens)}
                                />
                                <DetailRow
                                  label="Completion tokens"
                                  value={fmtTokens(log.completionTokens)}
                                />
                                <DetailRow
                                  label="Total tokens"
                                  value={fmtTokens(log.totalTokens)}
                                />
                                <DetailRow
                                  label="Finish reason"
                                  value={detail?.finishReason ?? "—"}
                                />
                                <DetailRow
                                  label="Latency"
                                  value={fmtLatency(log.latencyMs)}
                                />
                                {(detail?.errorMessage || log.status === "FAILED") && (
                                  <div className="sm:col-span-2 lg:col-span-3">
                                    <DetailRow
                                      label="Error"
                                      value={
                                        <span className="text-destructive">
                                          {detail?.errorMessage ?? "Request failed"}
                                        </span>
                                      }
                                    />
                                  </div>
                                )}
                              </div>

                              {/* ── Cost breakdown ── */}
                              <div className="rounded-xl border border-border bg-background p-4">
                                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                  Cost Breakdown
                                </p>
                                <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-3">
                                  <DetailRow
                                    label="Provider cost"
                                    value={fmtCost(detail?.providerCost ?? log.totalCost)}
                                  />
                                  <DetailRow
                                    label="Platform markup"
                                    value={
                                      detail?.platformMarkupPercent
                                        ? `${detail.platformMarkupPercent}% → ${fmtCost(detail.platformMarkup ?? "0")}`
                                        : "—"
                                    }
                                  />
                                  <DetailRow
                                    label="Total charged"
                                    value={
                                      <span className="font-semibold text-foreground">
                                        {fmtCost(log.totalCost)}
                                      </span>
                                    }
                                  />
                                </div>
                              </div>

                              {/* ── Request payload ── */}
                              {detail?.requestPayload && (
                                <div className="rounded-xl border border-border bg-background">
                                  <button
                                    onClick={() => setShowPayload((v) => !v)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors rounded-xl"
                                  >
                                    {showPayload
                                      ? <ChevronDown className="size-3.5 text-muted-foreground" />
                                      : <ChevronRight className="size-3.5 text-muted-foreground" />}
                                    Request Payload
                                  </button>
                                  {showPayload && (
                                    <pre className="max-h-64 overflow-auto border-t border-border px-4 py-3 text-xs text-foreground font-mono leading-relaxed">
                                      {JSON.stringify(detail.requestPayload, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}

                              {/* ── Response metadata ── */}
                              {detail?.responseMetadata && (
                                <div className="rounded-xl border border-border bg-background">
                                  <button
                                    onClick={() => setShowResponse((v) => !v)}
                                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40 transition-colors rounded-xl"
                                  >
                                    {showResponse
                                      ? <ChevronDown className="size-3.5 text-muted-foreground" />
                                      : <ChevronRight className="size-3.5 text-muted-foreground" />}
                                    Response Metadata
                                  </button>
                                  {showResponse && (
                                    <pre className="max-h-64 overflow-auto border-t border-border px-4 py-3 text-xs text-foreground font-mono leading-relaxed">
                                      {JSON.stringify(detail.responseMetadata, null, 2)}
                                    </pre>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
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
            {/* Page size */}
            <FilterSelect
              value={String(limit)}
              onChange={(v) => setLimit(Number(v))}
              className="w-20"
            >
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </FilterSelect>

            {/* Prev / Next */}
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

// ── Small helper component ────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">{value}</span>
    </div>
  );
}
