"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Clock,
  Zap,
  DollarSign,
  Copy,
  Check,
  Activity,
  FileText,
  ChevronDown,
  ChevronRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
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
import { useProjectStore } from "@/store/projectStore";
import type { ApiKey } from "@/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type LogStatus = "SUCCESS" | "ERROR" | "PENDING";

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
  project: { name: string };
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
  const d = new Date(ts);
  return {
    date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    time: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    full: d.toLocaleString(undefined, {
      month: "short", day: "numeric", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    }),
  };
}

function fmtLatency(ms: number | null | undefined) {
  if (ms == null) return "—";
  return ms >= 1000 ? `${(ms / 1000).toFixed(2)}s` : `${ms}ms`;
}

function fmtCost(usd: string | null | undefined) {
  if (usd == null) return "—";
  const n = parseFloat(usd);
  if (isNaN(n)) return "—";
  if (n === 0) return "—";
  if (n < 0.0001) return "<$0.0001";
  if (n < 0.01) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

function fmtTokensShort(n: number | null | undefined) {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

function fmtTokensFull(n: number | null | undefined) {
  if (n == null) return "—";
  return n.toLocaleString();
}

function latencyColor(ms: number | null | undefined): string {
  if (ms == null) return "text-[#94A3B8]";
  if (ms >= 1000) return "text-[#D97706]";
  return "text-[#475569]";
}

function costColor(usd: string | null | undefined): string {
  if (usd == null) return "text-[#94A3B8]";
  const n = parseFloat(usd ?? "0");
  if (isNaN(n) || n === 0) return "text-[#94A3B8]";
  return "text-[#16A34A]";
}

function calcThroughput(completionTokens: number, completionTimeMs: number): string {
  if (!completionTimeMs || !completionTokens) return "—";
  return `${Math.round(completionTokens / (completionTimeMs / 1000)).toLocaleString()} tok/s`;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { dot: string; bg: string; text: string; border: string; label: string }> = {
  SUCCESS: { dot: "#16A34A", bg: "#DCFCE7", text: "#15803D", border: "#BBF7D0", label: "Success" },
  ERROR:   { dot: "#DC2626", bg: "#FEE2E2", text: "#DC2626", border: "#FECACA", label: "Error"   },
  PENDING: { dot: "#D97706", bg: "#FEF3C7", text: "#B45309", border: "#FDE68A", label: "Pending" },
};

const STATUS_FALLBACK = { dot: "#94A3B8", bg: "#F1F5F9", text: "#475569", border: "#CBD5E1", label: "Unknown" };

function StatusBadge({ status, size = "sm" }: { status: LogStatus; size?: "sm" | "md" }) {
  const cfg = STATUS_CFG[status] ?? STATUS_FALLBACK;
  if (size === "sm") {
    return (
      <span className="inline-flex items-center gap-[6px] flex-shrink-0" style={{ color: cfg.dot }}>
        <span className="w-[7px] h-[7px] rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
        <span className="text-[12px] font-semibold">{cfg.label}</span>
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-semibold border flex-shrink-0"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
}

// ── Type badge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: string }) {
  if (type === "CHAT") {
    return (
      <span className="inline-flex items-center rounded-md px-1.5 py-[3px] text-[10px] font-bold flex-shrink-0 uppercase tracking-[0.06em] bg-[#5B4DFF] text-white">
        CHAT
      </span>
    );
  }
  if (type === "STREAM") {
    return (
      <span className="inline-flex items-center rounded-md px-1.5 py-[3px] text-[10px] font-bold flex-shrink-0 uppercase tracking-[0.06em] border border-[#94A3B8] text-[#64748B]">
        STREAM
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-md px-1.5 py-[3px] text-[10px] font-bold flex-shrink-0 uppercase tracking-[0.06em] bg-[#F1F5F9] text-[#64748B]">
      {type}
    </span>
  );
}

// ── Copy button ───────────────────────────────────────────────────────────────

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
      className="ml-1 inline-flex items-center text-[#94A3B8] hover:text-[#475569] transition-colors"
    >
      {copied ? <Check className="size-3 text-[#16A34A]" /> : <Copy className="size-3" />}
    </button>
  );
}

// ── Sortable header cell ──────────────────────────────────────────────────────

function SortHead({
  col, label, current, order, onToggle, align = "left", className,
}: {
  col: string; label: string; current: string; order: "asc" | "desc";
  onToggle: (col: string) => void; align?: "left" | "right"; className?: string;
}) {
  const active = current === col;
  return (
    <TableHead
      onClick={() => onToggle(col)}
      className={cn(
        "cursor-pointer select-none group/sort text-[11px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8] hover:text-[#475569] transition-colors",
        align === "right" && "text-right",
        className
      )}
    >
      <span className={cn("inline-flex items-center gap-1", align === "right" && "justify-end w-full")}>
        {label}
        <span className={cn("transition-opacity", active ? "opacity-100 text-[#5B4DFF]" : "opacity-0 group-hover/sort:opacity-50")}>
          {active
            ? (order === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)
            : <ArrowUpDown className="size-3" />}
        </span>
      </span>
    </TableHead>
  );
}

// ── KPI card (drawer) ─────────────────────────────────────────────────────────

function KpiCard({
  icon: Icon, iconColor, label, value, valueClass,
}: {
  icon: React.ElementType; iconColor: string; label: string;
  value: React.ReactNode; valueClass?: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl px-4 py-3.5">
      <div className="flex items-center gap-1.5 mb-2.5">
        <Icon className="size-3.5 flex-shrink-0" style={{ color: iconColor }} />
        <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">{label}</span>
      </div>
      <div className={cn("text-[18px] font-bold text-[#0F172A] tracking-tight leading-none", valueClass)}>
        {value}
      </div>
    </div>
  );
}

// ── Token breakdown ───────────────────────────────────────────────────────────

function TokenBreakdown({ prompt, completion, total }: { prompt: number; completion: number; total: number }) {
  const inputPct  = total > 0 ? (prompt / total) * 100 : 0;
  const outputPct = total > 0 ? (completion / total) * 100 : 0;

  return (
    <div>
      {/* Stacked bar */}
      <div className="h-2.5 rounded-full overflow-hidden bg-[#F1F5F9] flex mb-5">
        <div
          className="h-full bg-[#5B4DFF] transition-all duration-700 rounded-l-full"
          style={{ width: `${inputPct}%` }}
        />
        <div
          className="h-full bg-[#A5B4FC] transition-all duration-700 rounded-r-full"
          style={{ width: `${outputPct}%` }}
        />
      </div>
      {/* Legend */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { dot: "#5B4DFF", label: "Input",  val: prompt,     pct: inputPct  },
          { dot: "#A5B4FC", label: "Output", val: completion, pct: outputPct },
          { dot: "#CBD5E1", label: "Total",  val: total,      pct: 100       },
        ].map((item) => (
          <div key={item.label} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.dot }} />
              <span className="text-[11px] font-semibold text-[#64748B]">{item.label}</span>
            </div>
            <div className="text-[16px] font-bold text-[#0F172A] tracking-tight">{fmtTokensFull(item.val)}</div>
            <div className="text-[11px] text-[#94A3B8]">{item.pct.toFixed(1)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Drawer meta row ───────────────────────────────────────────────────────────

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">{label}</span>
      <span className="text-[13px] font-medium text-[#0F172A] leading-snug">{children}</span>
    </div>
  );
}

// ── Drawer section wrapper ────────────────────────────────────────────────────

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-6 py-5 border-b border-[#F1F5F9]">
      <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8] mb-4">{title}</p>
      {children}
    </div>
  );
}

// ── JSON accordion ────────────────────────────────────────────────────────────

function JsonAccordion({ label, data }: { label: string; data: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const keyCount = Object.keys(data).length;
  return (
    <div className="rounded-xl border border-[#E2E8F0] overflow-hidden bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-[12.5px] font-semibold text-[#475569] hover:bg-[#F8FAFC] transition-colors"
      >
        <span className="flex items-center gap-2">
          {open ? (
            <ChevronDown className="size-3.5 text-[#94A3B8]" />
          ) : (
            <ChevronRight className="size-3.5 text-[#94A3B8]" />
          )}
          {label}
        </span>
        <span className="text-[10px] font-medium text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">
          {keyCount} {keyCount === 1 ? "key" : "keys"}
        </span>
      </button>
      {open && (
        <div className="border-t border-[#E2E8F0]">
          <pre className="max-h-64 overflow-auto px-4 py-3.5 text-[11.5px] font-mono text-[#475569] bg-[#F8FAFC] leading-relaxed">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

// ── Inline row expansion ─────────────────────────────────────────────────────

function InlineDetail({
  log,
  onViewFull,
}: {
  log: UsageLogItem;
  onViewFull: () => void;
}) {
  return (
    <div className="bg-[#F8FAFC] border-t border-[#EEF2FF] px-6 py-3.5">
      <div className="grid grid-cols-[2fr_2fr_2fr_1fr] gap-x-6 items-start mb-3">
        {/* Request ID */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#94A3B8] mb-1">Request ID</p>
          <div className="flex items-center gap-1 min-w-0">
            <span className="font-mono text-[11.5px] text-[#475569] truncate">{log.id}</span>
            <CopyButton text={log.id} />
          </div>
        </div>
        {/* API Key */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#94A3B8] mb-1">API Key</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[12px] text-[#475569]">{log.apiKey?.name ?? "—"}</span>
            {log.apiKey?.keyPrefix && (
              <span className="font-mono text-[11px] text-[#94A3B8]">· {log.apiKey.keyPrefix}</span>
            )}
            {log.apiKey?.status === "REVOKED" && (
              <span className="inline-flex items-center rounded px-1.5 py-[2px] text-[10px] font-bold uppercase tracking-[0.05em] bg-[#FEE2E2] text-[#DC2626]">
                Revoked
              </span>
            )}
          </div>
        </div>
        {/* Resolved Model */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#94A3B8] mb-1">Resolved Model</p>
          <span className="font-mono text-[11.5px] text-[#475569]">{log.resolvedModelSlug ?? "—"}</span>
        </div>
        {/* Completion Time */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.09em] text-[#94A3B8] mb-1">Completion Time</p>
          <span className="font-mono text-[12px] text-[#475569]">{fmtLatency(log.responseCompletionTimeMs)}</span>
        </div>
      </div>
      <div className="flex justify-end">
        <button
          onClick={(e) => { e.stopPropagation(); onViewFull(); }}
          className="text-[12px] font-semibold text-[#5B4DFF] hover:text-[#4338CA] flex items-center gap-1 transition-colors"
        >
          Full details
          <ChevronRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

// ── Log detail drawer ─────────────────────────────────────────────────────────

function LogDrawer({
  open,
  onClose,
  log,
  detail,
  detailLoading,
}: {
  open: boolean;
  onClose: () => void;
  log: UsageLogItem | null;
  detail: UsageLogDetail | undefined;
  detailLoading: boolean;
}) {
  if (!log) return null;

  const ts = fmtTimestamp(log.createdAt);
  const throughput = calcThroughput(log.completionTokens, log.responseCompletionTimeMs);
  const activeDetail = detail ?? (log as UsageLogDetail);

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="!w-full sm:!w-[560px] !max-w-[96vw] p-0 overflow-hidden flex flex-col"
        style={{ backgroundColor: "#F8FAFC", borderLeft: "1px solid #E2E8F0" }}
      >
        <SheetTitle className="sr-only">Generation Details</SheetTitle>

        {/* ── Sticky header ─────────────────────────────────────── */}
        <div
          className="flex-shrink-0 sticky top-0 z-10 border-b border-[#E2E8F0] px-6 pt-5 pb-4"
          style={{ background: "white" }}
        >
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#94A3B8] mb-1">
                Generation Details
              </p>
              <h3 className="text-[17px] font-bold text-[#0F172A] tracking-tight leading-snug truncate">
                {log.model?.displayName ?? log.requestedModelSlug}
              </h3>
              <p className="text-[12px] text-[#64748B] mt-0.5">
                {log.model?.provider?.displayName ?? "—"}
                <span className="mx-1.5 text-[#CBD5E1]">·</span>
                {ts.full}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#94A3B8] hover:text-[#475569] hover:border-[#CBD5E1] hover:bg-[#F8FAFC] transition-all"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={log.status} size="md" />
            <TypeBadge type={log.requestType} />
            {log.stream && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold bg-[#F0F9FF] text-[#0369A1] border border-[#BAE6FD]">
                <Zap className="size-2.5" />
                Streaming
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable body ───────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          {detailLoading ? (
            <div className="px-6 py-5 space-y-3">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-xl" style={{ background: "#E2E8F0" }} />
              ))}
            </div>
          ) : (
            <>
              {/* §1 — Performance Metrics */}
              <DrawerSection title="Performance Metrics">
                <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                  <KpiCard
                    icon={DollarSign} iconColor="#5B4DFF" label="Cost"
                    value={fmtCost(log.totalCost)} valueClass={costColor(log.totalCost)}
                  />
                  <KpiCard
                    icon={Clock} iconColor="#0369A1" label="Latency"
                    value={fmtLatency(log.latencyMs)} valueClass={latencyColor(log.latencyMs)}
                  />
                  <KpiCard
                    icon={Activity} iconColor="#0F766E" label="Compl. Time"
                    value={fmtLatency(log.responseCompletionTimeMs)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <KpiCard
                    icon={Zap} iconColor="#D97706" label="Throughput"
                    value={throughput}
                  />
                  <KpiCard
                    icon={Activity} iconColor="#7C3AED" label="Total Tokens"
                    value={fmtTokensFull(log.totalTokens)}
                  />
                </div>
              </DrawerSection>

              {/* §2 — Token Breakdown */}
              <DrawerSection title="Token Breakdown">
                <TokenBreakdown
                  prompt={log.promptTokens}
                  completion={log.completionTokens}
                  total={log.totalTokens}
                />
              </DrawerSection>

              {/* §3 — Request Metadata */}
              <DrawerSection title="Request Metadata">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <MetaRow label="Request ID">
                    <span className="flex items-center font-mono text-[12px] text-[#475569]">
                      {(activeDetail.id ?? log.id).slice(0, 14)}…
                      <CopyButton text={activeDetail.id ?? log.id} />
                    </span>
                  </MetaRow>
                  <MetaRow label="Timestamp">{ts.date}, {ts.time}</MetaRow>
                  <MetaRow label="API Key">
                    <span className="font-mono text-[12px] text-[#475569] bg-white border border-[#E2E8F0] rounded-lg px-2 py-0.5 inline-block">
                      {log.apiKey?.name ?? "—"}
                    </span>
                  </MetaRow>
                  <MetaRow label="Key Prefix">
                    <span className="font-mono text-[12px] text-[#475569]">{log.apiKey?.keyPrefix ?? "—"}</span>
                  </MetaRow>
                  <MetaRow label="Project">{log.project?.name ?? "—"}</MetaRow>
                  <MetaRow label="Streaming">
                    <span className={log.stream ? "text-[#0369A1]" : "text-[#94A3B8]"}>
                      {log.stream ? "Enabled" : "Disabled"}
                    </span>
                  </MetaRow>
                  {activeDetail.finishReason && (
                    <MetaRow label="Finish Reason">
                      <span className="font-mono text-[12px]">{activeDetail.finishReason}</span>
                    </MetaRow>
                  )}
                </div>
                {activeDetail.errorMessage && (
                  <div className="mt-4 bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-4 py-3">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#DC2626] mb-1.5">
                      Error
                    </p>
                    <p className="text-[12.5px] text-[#DC2626] leading-relaxed">
                      {activeDetail.errorMessage}
                    </p>
                  </div>
                )}
              </DrawerSection>

              {/* §4 — Model Details */}
              <DrawerSection title="Model Details">
                <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                  <MetaRow label="Display Name">{log.model?.displayName ?? "—"}</MetaRow>
                  <MetaRow label="Provider">{log.model?.provider?.displayName ?? "—"}</MetaRow>
                  <MetaRow label="Requested Model">
                    <span className="font-mono text-[12px] text-[#475569]">{log.requestedModelSlug ?? "—"}</span>
                  </MetaRow>
                  <MetaRow label="Resolved Model">
                    <span className="font-mono text-[12px] text-[#475569]">
                      {log.resolvedModelSlug ?? log.model?.slug ?? "—"}
                    </span>
                  </MetaRow>
                </div>
              </DrawerSection>

              {/* §5 — Developer Details (collapsible JSON) */}
              {(activeDetail.requestPayload || activeDetail.responseMetadata) && (
                <DrawerSection title="Developer Details">
                  <div className="space-y-2.5">
                    {activeDetail.requestPayload && (
                      <JsonAccordion label="Request Payload" data={activeDetail.requestPayload} />
                    )}
                    {activeDetail.responseMetadata && (
                      <JsonAccordion label="Response Metadata" data={activeDetail.responseMetadata} />
                    )}
                  </div>
                </DrawerSection>
              )}

              <div className="h-10" />
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ── Select (styled) ───────────────────────────────────────────────────────────

const SELECT_ARROW =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

function StyledSelect({
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
        "h-9 rounded-xl border border-[#E2E8F0] bg-white pl-3 pr-8 text-[13px] text-[#0F172A] outline-none",
        "focus:border-[#5B4DFF] focus:ring-2 focus:ring-[#5B4DFF]/10 cursor-pointer appearance-none transition-all",
        className
      )}
      style={{
        backgroundImage: SELECT_ARROW,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 10px center",
      }}
    >
      {children}
    </select>
  );
}

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 28 } },
};

const PRESET_LABELS: { key: Preset; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "custom", label: "Custom" },
];

// ── Main page ─────────────────────────────────────────────────────────────────

export default function UsagePage() {
  const activeProject = useProjectStore((s) => s.activeProject);

  const [preset, setPreset]         = useState<Preset>("7d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [model, setModel]             = useState("");
  const [status, setStatus]           = useState("");
  const [capability, setCapability]   = useState("");
  const [apiKeyId, setApiKeyId]       = useState("");
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);
  const [selectedId, setSelectedId]   = useState<string | null>(null);
  const [drawerLogId, setDrawerLogId] = useState<string | null>(null);
  const [sortBy, setSortBy]           = useState("timestamp");
  const [sortOrder, setSortOrder]     = useState<"asc" | "desc">("desc");

  const searchParams = useSearchParams();

  useEffect(() => {
    const requestId = searchParams.get("requestId");
    if (requestId) setSelectedId(requestId);
  }, [searchParams]);

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  const toggleSort = (col: string) => {
    if (sortBy === col) setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortOrder("desc"); }
  };

  useEffect(() => {
    setPage(1);
  }, [preset, customStart, customEnd, model, status, apiKeyId, capability, limit]);

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, pageSize: limit };
    if (activeProject?.id) p.projectId = activeProject.id;
    if (preset === "custom") {
      if (dateRange.startDate) p.from = `${dateRange.startDate}T00:00:00.000Z`;
      if (dateRange.endDate)   p.to   = `${dateRange.endDate}T23:59:59.000Z`;
      if (dateRange.startDate && dateRange.endDate) p.dateRangePreset = "custom";
    } else {
      const PRESET_MAP: Record<string, string> = { "7d": "past_7d", "30d": "past_30d", "90d": "past_30d" };
      p.dateRangePreset = PRESET_MAP[preset] ?? "past_7d";
    }
    if (model)      p.search      = model;
    if (status)     p.status      = status;
    if (apiKeyId)   p.apiKeyId    = apiKeyId;
    if (capability) p.requestType = capability;
    if (sortBy) {
      const SORT_MAP: Record<string, string> = {
        timestamp: "createdAt", totalTokens: "totalTokens", costUsd: "totalCost",
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
    queryFn: () => api.get("/api-keys", { params: { projectId: activeProject!.id } }).then((r) => r.data),
    enabled: !!activeProject,
  });

  const { data: detail, isLoading: detailLoading } = useQuery<UsageLogDetail>({
    queryKey: ["usage-detail", drawerLogId],
    queryFn: () => api.get(`/usage/logs/${drawerLogId}`).then((r) => r.data),
    enabled: !!drawerLogId,
  });

  const logs       = data?.data ?? [];
  const total      = data?.totalRecords ?? 0;
  const totalPages = data?.totalPages ?? 0;

  const selectedLog = useMemo(
    () => logs.find((l) => l.id === drawerLogId) ?? (detail as UsageLogItem | undefined) ?? null,
    [drawerLogId, logs, detail]
  );

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">

      {/* ── Page header ───────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold text-[#0F172A] tracking-tight">Usage Logs</h2>
          <p className="text-[13px] text-[#64748B] mt-0.5">
            Inspect every API request made with your keys.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            aria-label="Refresh"
            className={cn(
              "w-9 h-9 rounded-xl border border-[#E2E8F0] bg-white flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:shadow-sm transition-all",
              isFetching && "animate-spin text-[#5B4DFF]"
            )}
          >
            <RefreshCw className="size-4" />
          </button>
          <button
            onClick={() =>
              toast.info("Export coming soon", {
                description: "CSV / JSON export will be available in a future update.",
              })
            }
            className="h-9 px-4 rounded-xl border border-[#E2E8F0] bg-white text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] hover:border-[#CBD5E1] hover:shadow-sm flex items-center gap-2 transition-all"
          >
            <Download className="size-3.5" />
            Export
          </button>
        </div>
      </motion.div>

      {/* ── Filter bar ────────────────────────────────────────────── */}
      <motion.div
        variants={itemVariants}
        className="bg-white border border-[#E2E8F0] rounded-2xl px-5 py-4 shadow-sm"
      >
        <div className="flex flex-wrap items-end gap-3">
          {/* Date presets */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">Date Range</span>
            <div className="flex rounded-xl border border-[#E2E8F0] overflow-hidden bg-[#F8FAFC] p-0.5 gap-0.5">
              {PRESET_LABELS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setPreset(key)}
                  className={cn(
                    "px-3 py-1.5 text-[12.5px] font-semibold rounded-[9px] transition-all",
                    preset === key
                      ? "bg-white text-[#5B4DFF] shadow-sm border border-[#E2E8F0]"
                      : "text-[#64748B] hover:text-[#0F172A]"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {preset === "custom" && (
            <>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">From</span>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] outline-none focus:border-[#5B4DFF] focus:ring-2 focus:ring-[#5B4DFF]/10 transition-all"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">To</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-9 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] outline-none focus:border-[#5B4DFF] focus:ring-2 focus:ring-[#5B4DFF]/10 transition-all"
                />
              </div>
            </>
          )}

          <div className="hidden sm:block w-px h-8 bg-[#E2E8F0] self-end" />

          {/* Model */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">Model</span>
            <input
              type="text"
              placeholder="e.g. gpt-4o"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-9 w-36 rounded-xl border border-[#E2E8F0] bg-white px-3 text-[13px] text-[#0F172A] placeholder:text-[#94A3B8] outline-none focus:border-[#5B4DFF] focus:ring-2 focus:ring-[#5B4DFF]/10 transition-all"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">Status</span>
            <StyledSelect value={status} onChange={setStatus}>
              <option value="">All statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="PARTIAL">Partial</option>
              <option value="STOPPED">Stopped</option>
            </StyledSelect>
          </div>

          {/* Type */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">Type</span>
            <StyledSelect value={capability} onChange={setCapability}>
              <option value="">All types</option>
              <option value="CHAT">Chat</option>
              <option value="IMAGE">Image</option>
              <option value="AUDIO">Audio</option>
              <option value="VIDEO">Video</option>
              <option value="EMBEDDING">Embedding</option>
            </StyledSelect>
          </div>

          {/* API key */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-[#94A3B8]">API Key</span>
            <StyledSelect value={apiKeyId} onChange={setApiKeyId} className="max-w-[160px]">
              <option value="">All keys</option>
              {keys.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name} ({k.keyPrefix})
                </option>
              ))}
            </StyledSelect>
          </div>
        </div>
      </motion.div>

      {/* ── Table ─────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        {isLoading ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl p-4 space-y-2 shadow-sm">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-xl" style={{ background: "#F1F5F9" }} />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl py-24 flex flex-col items-center justify-center gap-4 text-center shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center">
              <FileText className="size-7 text-[#94A3B8]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#0F172A]">No logs found</p>
              <p className="text-[13px] text-[#64748B] mt-1">Try adjusting your filters or date range.</p>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
            {/* Fetch progress bar */}
            {isFetching && (
              <div className="h-0.5 w-full bg-gradient-to-r from-[#5B4DFF]/0 via-[#5B4DFF] to-[#5B4DFF]/0 animate-pulse" />
            )}

            <Table>
              <TableHeader>
                <TableRow
                  className="border-b border-[#E2E8F0]"
                  style={{ background: "#FAFAFA" }}
                >
                  <SortHead
                    col="timestamp" label="Time"
                    current={sortBy} order={sortOrder} onToggle={toggleSort}
                    className="w-[88px] pl-4 pr-2 py-3"
                  />
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8] px-2 py-3">
                    Model
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8] w-[110px] px-2 py-3">
                    Project
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8] w-[100px] px-2 py-3">
                    Status
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8] w-[78px] px-2 py-3">
                    Type
                  </TableHead>
                  <SortHead
                    col="totalTokens" label="Tokens"
                    current={sortBy} order={sortOrder} onToggle={toggleSort} align="right"
                    className="w-[92px] px-2 py-3"
                  />
                  <SortHead
                    col="costUsd" label="Cost"
                    current={sortBy} order={sortOrder} onToggle={toggleSort} align="right"
                    className="w-[88px] px-2 py-3"
                  />
                  <TableHead className="text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-[#94A3B8] w-[80px] px-2 py-3">
                    Latency
                  </TableHead>
                  <TableHead className="w-10 pr-4 py-3" />
                </TableRow>
              </TableHeader>

              <TableBody>
                {logs.map((log) => {
                  const isSelected = selectedId === log.id;
                  const ts = fmtTimestamp(log.createdAt);
                  return (
                    <React.Fragment key={log.id}>
                    <TableRow
                      onClick={() => setSelectedId((prev) => (prev === log.id ? null : log.id))}
                      className={cn(
                        "group cursor-pointer border-b border-[#F1F5F9] transition-all duration-100",
                        isSelected
                          ? "bg-[#EEF2FF] shadow-[inset_4px_0_0_#5B4DFF] border-b-transparent"
                          : "hover:bg-[#F8FAFC]"
                      )}
                    >
                      {/* Time */}
                      <TableCell className="py-2.5 pl-4 pr-2 w-[88px]">
                        <div className="font-mono text-[12px] font-semibold text-[#0F172A] tabular-nums leading-snug">{ts.time}</div>
                        <div className="font-mono text-[10.5px] text-[#94A3B8] mt-0.5 tabular-nums">{ts.date}</div>
                      </TableCell>

                      {/* Model */}
                      <TableCell className="py-2.5 px-2">
                        <div className="text-[13px] font-semibold text-[#0F172A] max-w-[200px] truncate leading-snug">
                          {log.model?.displayName ?? log.requestedModelSlug}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] mt-0.5 max-w-[200px] truncate">
                          {log.model?.provider?.displayName ?? "—"}
                        </div>
                      </TableCell>

                      {/* Project */}
                      <TableCell className="py-2.5 px-2 w-[110px]">
                        <span
                          title={log.project?.name}
                          className={cn(
                            "text-[12px] truncate block max-w-[100px] cursor-default",
                            log.project?.name ? "text-[#475569]" : "text-[#94A3B8]"
                          )}
                        >
                          {log.project?.name ?? "—"}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell className="py-2.5 px-2 w-[100px]">
                        <StatusBadge status={log.status} />
                      </TableCell>

                      {/* Type */}
                      <TableCell className="py-2.5 px-2 w-[78px]">
                        <TypeBadge type={log.requestType} />
                      </TableCell>

                      {/* Tokens */}
                      <TableCell className="py-2.5 px-2 text-right w-[92px]">
                        <div className="font-mono text-[12.5px] font-bold text-[#0F172A] tabular-nums leading-snug">
                          {fmtTokensShort(log.totalTokens)}
                        </div>
                        <div className="font-mono text-[10px] text-[#94A3B8] mt-0.5 tabular-nums">
                          ↑{fmtTokensShort(log.promptTokens)}&nbsp;+{fmtTokensShort(log.completionTokens)}
                        </div>
                      </TableCell>

                      {/* Cost */}
                      <TableCell className="py-2.5 px-2 text-right w-[88px]">
                        <span className={cn("font-mono text-[12.5px] font-bold tabular-nums leading-snug", costColor(log.totalCost))}>
                          {fmtCost(log.totalCost)}
                        </span>
                      </TableCell>

                      {/* Latency */}
                      <TableCell className="py-2.5 px-2 text-right w-[80px]">
                        <span className={cn("font-mono text-[12.5px] font-semibold tabular-nums leading-snug", latencyColor(log.latencyMs))}>
                          {fmtLatency(log.latencyMs)}
                        </span>
                      </TableCell>

                      {/* Chevron affordance */}
                      <TableCell className="py-2.5 pr-4 pl-2 w-10 text-right">
                        {isSelected
                          ? <ChevronDown className="size-4 ml-auto text-[#5B4DFF] transition-colors duration-100" />
                          : <ChevronRight className="size-4 ml-auto text-[#E2E8F0] group-hover:text-[#CBD5E1] transition-colors duration-100" />
                        }
                      </TableCell>
                    </TableRow>
                    {isSelected && (
                      <TableRow className="border-b border-[#F1F5F9]">
                        <TableCell colSpan={9} className="p-0">
                          <InlineDetail
                            log={log}
                            onViewFull={() => setDrawerLogId(log.id)}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* ── Pagination ────────────────────────────────────────────── */}
      {!isLoading && total > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[13px] text-[#64748B]">
            Showing{" "}
            <span className="font-semibold text-[#0F172A]">
              {(page - 1) * limit + 1}–{Math.min(page * limit, total)}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[#0F172A]">{total.toLocaleString()}</span>{" "}
            results
          </p>

          <div className="flex items-center gap-2">
            <StyledSelect value={String(limit)} onChange={(v) => setLimit(Number(v))}>
              <option value="20">20 / page</option>
              <option value="50">50 / page</option>
              <option value="100">100 / page</option>
            </StyledSelect>

            <div className="flex items-center gap-1">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-8 px-3 rounded-xl border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>

              <div className="hidden sm:flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={cn(
                        "w-8 h-8 rounded-xl text-[12.5px] font-semibold transition-all",
                        page === p
                          ? "bg-[#5B4DFF] text-white shadow-sm"
                          : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#0F172A] border border-transparent hover:border-[#E2E8F0]"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
                {totalPages > 5 && (
                  <span className="text-[#94A3B8] text-[13px] px-1">…</span>
                )}
              </div>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-8 px-3 rounded-xl border border-[#E2E8F0] bg-white text-[12.5px] font-semibold text-[#475569] hover:bg-[#F8FAFC] hover:border-[#CBD5E1] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── Right-side detail drawer ───────────────────────────────── */}
      <LogDrawer
        open={!!drawerLogId}
        onClose={() => setDrawerLogId(null)}
        log={selectedLog}
        detail={detail}
        detailLoading={detailLoading}
      />
    </motion.div>
  );
}
