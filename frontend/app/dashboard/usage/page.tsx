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
import type { ApiKey } from "@/types";

// ── Local types for this endpoint ─────────────────────────────────────────────

type LogStatus = "SUCCESS" | "FAILED" | "PARTIAL" | "PENDING";

interface UsageLogItem {
  id: string;
  requestId: string;
  timestamp: string;
  model: string;
  apiKeyPrefix: string;
  capability: string;
  status: LogStatus;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: string;
  latencyMs: number;
}

interface UsageLogDetail extends UsageLogItem {
  finishReason?: string;
  errorMessage?: string;
}

interface UsageResponse {
  data: UsageLogItem[];
  total: number;
  page: number;
  limit: number;
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

function fmtLatency(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function fmtCost(usd: string) {
  const n = parseFloat(usd);
  if (isNaN(n)) return "—";
  return n < 0.0001 ? "<$0.0001" : `$${n.toFixed(4)}`;
}

function fmtTokens(n: number) {
  return n.toLocaleString();
}



// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<LogStatus, string> = {
  SUCCESS: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  PENDING: "bg-blue-100 text-blue-700",
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



  // Build query params (omit blanks)
  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, limit };
    if (dateRange.startDate) p.startDate = dateRange.startDate;
    if (dateRange.endDate) p.endDate = dateRange.endDate;
    if (model) p.model = model;
    if (status) p.status = status;
    if (apiKeyId) p.apiKeyId = apiKeyId;
    if (capability) p.capability = capability;
    if (sortBy) p.sortBy = sortBy;
    if (sortOrder) p.sortOrder = sortOrder;
    return p;
  }, [page, limit, dateRange, model, status, apiKeyId, capability, sortBy, sortOrder]);

  // Usage logs query
  const { data, isLoading, isFetching, refetch } = useQuery<UsageResponse>({
    queryKey: ["usage", queryParams],
    queryFn: () =>
      api.get("/api/v1/usage", { params: queryParams }).then((r) => r.data),
  });

  // API keys for the filter dropdown
  const { data: keys = [] } = useQuery<ApiKey[]>({
    queryKey: ["keys"],
    queryFn: () => api.get("/api/v1/keys").then((r) => r.data),
  });

  // Detail fetch for expanded row
  const { data: detail, isLoading: detailLoading } = useQuery<UsageLogDetail>({
    queryKey: ["usage-detail", expandedId],
    queryFn: () =>
      api.get(`/api/v1/usage/${expandedId}`).then((r) => r.data),
    enabled: !!expandedId,
  });

  const logs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

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
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Usage Logs</h2>
          <p className="text-sm text-muted-foreground">
            Inspect every API request made with your keys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            aria-label="Refresh"
            className={cn(isFetching && "animate-spin")}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              toast.info("Export coming soon", {
                description: "CSV / JSON export will be available in a future update.",
              })
            }
          >
            <Download className="size-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
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
            <option value="PENDING">Pending</option>
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
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-2 rounded-2xl border border-border p-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No logs found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or date range.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
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
                        {log.requestId}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                        {fmtTimestamp(log.timestamp)}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.model}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.apiKeyPrefix}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {log.capability}
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
                        {fmtCost(log.costUsd)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {fmtLatency(log.latencyMs)}
                      </TableCell>
                    </TableRow>


                    {/* Inline detail panel */}
                    {isExpanded && (
                      <tr className="border-b border-border bg-muted/30">
                        <td colSpan={12} className="px-6 py-4">
                          {detailLoading ? (
                            <div className="space-y-2">
                              <Skeleton className="h-4 w-64" />
                              <Skeleton className="h-4 w-48" />
                            </div>
                          ) : (
                            <div className="grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                              <DetailRow
                                label="Request ID"
                                value={
                                  <span className="font-mono text-xs break-all">
                                    {detail?.requestId ?? log.requestId}
                                  </span>
                                }
                              />
                              <DetailRow
                                label="Full timestamp"
                                value={new Date(log.timestamp).toLocaleString()}
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
                              <DetailRow
                                label="Cost"
                                value={fmtCost(log.costUsd)}
                              />
                              {(detail?.errorMessage ||
                                log.status === "FAILED") && (
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

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
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
        </div>
      )}
    </div>
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
