"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  Receipt,
  TrendingUp,
  CalendarDays,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Invoice, InvoiceStatus, PaginatedResponse } from "@/types";

// ── Animation variants ─────────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 420, damping: 32 },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtCurrency(amount: string, currency = "USD") {
  const n = parseFloat(amount);
  if (isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function fmtDateRelative(ts: string) {
  const date = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return fmtDate(ts);
}

function truncate(str: string, maxLen = 20) {
  if (!str) return "—";
  return str.length > maxLen ? `${str.slice(0, maxLen)}…` : str;
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  InvoiceStatus,
  { label: string; icon: React.ReactNode; classes: string }
> = {
  PAID: {
    label: "Paid",
    icon: <CheckCircle2 className="size-3" />,
    classes: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  },
  ISSUED: {
    label: "Issued",
    icon: <FileText className="size-3" />,
    classes: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  },
  PENDING: {
    label: "Pending",
    icon: <Clock className="size-3" />,
    classes: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  },
  VOID: {
    label: "Void",
    icon: <XCircle className="size-3" />,
    classes: "bg-red-500/10 text-red-600 border-red-500/20",
  },
};

function StatusBadge({ status }: { status: InvoiceStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.PENDING;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
        cfg.classes
      )}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

// ── Provider badge ─────────────────────────────────────────────────────────────

function ProviderBadge({ provider }: { provider: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-medium text-muted-foreground">
      {provider}
    </span>
  );
}

// ── Summary stat card ─────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  gradient,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  gradient: string;
  loading?: boolean;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card
        className={cn(
          "relative overflow-hidden rounded-2xl border-border/40 shadow-sm transition-all hover:shadow-md",
          gradient
        )}
      >
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            {icon}
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-8 w-32 rounded-lg" />
          ) : (
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {value}
            </p>
          )}
          {sub && (
            <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
          )}
        </CardContent>
        {/* subtle shimmer accent */}
        <div className="pointer-events-none absolute -right-6 -top-6 size-24 rounded-full bg-white/5 blur-2xl" />
      </Card>
    </motion.div>
  );
}

// ── Filter select ──────────────────────────────────────────────────────────────

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
        "h-9 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring cursor-pointer",
        className
      )}
    >
      {children}
    </select>
  );
}

// ── Download button ────────────────────────────────────────────────────────────

function DownloadButton({ invoice }: { invoice: Invoice }) {
  const url = invoice.invoiceUrl;

  if (!url) {
    return (
      <Button
        variant="ghost"
        size="sm"
        disabled
        title="Invoice PDF not yet available"
        className="h-8 gap-1.5 text-xs text-muted-foreground/50"
      >
        <AlertCircle className="size-3.5" />
        <span className="hidden sm:inline">Pending</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-8 gap-1.5 text-xs border-primary/30 text-primary transition-all hover:-translate-y-0.5 hover:bg-primary/5 hover:shadow-sm"
      onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
      title="Download your invoice PDF"
    >
      <Download className="size-3.5" />
      <span className="hidden sm:inline">Download</span>
    </Button>
  );
}

// ── Skeleton rows ──────────────────────────────────────────────────────────────

function TableSkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <TableRow key={i} className="hover:bg-transparent">
          {Array.from({ length: 7 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full rounded" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

type DatePreset = "7d" | "30d" | "90d" | "all";

const PRESET_LABELS: { key: DatePreset; label: string }[] = [
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
  { key: "90d", label: "90d" },
  { key: "all", label: "All" },
];

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, string | number> = { page, pageSize };
    if (statusFilter) params.status = statusFilter;
    return params;
  }, [page, pageSize, statusFilter]);

  // ── Data fetching ─────────────────────────────────────────────────────────

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery<PaginatedResponse<Invoice>>({
    queryKey: ["billing-invoices", queryParams],
    queryFn: () =>
      api
        .get("/billing/invoices", { params: queryParams })
        .then((r) => r.data),
    staleTime: 30_000,
    retry: 1,
  });

  const invoices = data?.data ?? [];
  const totalRecords = data?.totalRecords ?? 0;
  const totalPages = data?.totalPages ?? 1;

  // ── Client-side date filter (applied on top of server data) ──────────────

  const filteredInvoices = useMemo(() => {
    if (datePreset === "all") return invoices;
    const days = datePreset === "7d" ? 7 : datePreset === "30d" ? 30 : 90;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    return invoices.filter((inv) => new Date(inv.createdAt) >= cutoff);
  }, [invoices, datePreset]);

  // ── Summary stats ─────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const paid = filteredInvoices.filter((inv) => inv.status === "PAID");
    const totalPaid = paid.reduce(
      (sum, inv) => sum + parseFloat(inv.amount || "0"),
      0
    );
    const lastPayment = filteredInvoices[0]?.createdAt ?? null;
    return {
      totalPaid: fmtCurrency(totalPaid.toFixed(2)),
      count: filteredInvoices.length,
      lastPayment: lastPayment ? fmtDateRelative(lastPayment) : "—",
    };
  }, [filteredInvoices]);

  // ── Error message helper ──────────────────────────────────────────────────

  const errorMessage = useMemo(() => {
    if (!error) return "Unknown error";
    if (error instanceof Error) return error.message;
    return String(error);
  }, [error]);

  // ── Reset page when filters change ────────────────────────────────────────

  const handleStatusChange = (v: string) => {
    setStatusFilter(v);
    setPage(1);
  };

  const handlePresetChange = (v: DatePreset) => {
    setDatePreset(v);
    setPage(1);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground/90">
          Invoices
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your complete payment history and downloadable invoice PDFs.
        </p>
      </motion.div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<TrendingUp className="size-4" />}
          label="Total Paid"
          value={isLoading ? "…" : stats.totalPaid}
          sub="All completed payments"
          gradient="bg-gradient-to-br from-emerald-500/8 via-background to-background"
          loading={isLoading}
        />
        <StatCard
          icon={<Receipt className="size-4" />}
          label="Total Invoices"
          value={isLoading ? "…" : String(stats.count)}
          sub={
            datePreset === "all"
              ? "All time"
              : `Last ${datePreset === "7d" ? "7" : datePreset === "30d" ? "30" : "90"} days`
          }
          gradient="bg-gradient-to-br from-primary/8 via-background to-background"
          loading={isLoading}
        />
        <StatCard
          icon={<CalendarDays className="size-4" />}
          label="Last Payment"
          value={isLoading ? "…" : stats.lastPayment}
          gradient="bg-gradient-to-br from-violet-500/8 via-background to-background"
          loading={isLoading}
        />
      </div>

      {/* Filter bar */}
      <motion.div
        variants={itemVariants}
        className="flex flex-wrap items-end gap-3 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm"
      >
        {/* Date preset */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Date range
          </span>
          <div className="flex overflow-hidden rounded-lg border border-border">
            {PRESET_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => handlePresetChange(key)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium transition-colors",
                  datePreset === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="hidden h-8 w-px bg-border sm:block" />

        {/* Status filter */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Status
          </span>
          <FilterSelect value={statusFilter} onChange={handleStatusChange}>
            <option value="">All statuses</option>
            <option value="PAID">Paid</option>
            <option value="ISSUED">Issued</option>
            <option value="PENDING">Pending</option>
            <option value="VOID">Void</option>
          </FilterSelect>
        </div>

        {/* Record count */}
        {!isLoading && (
          <div className="ml-auto self-end">
            <span className="text-xs text-muted-foreground">
              {filteredInvoices.length > 0
                ? `${filteredInvoices.length} invoice${filteredInvoices.length !== 1 ? "s" : ""}`
                : "No invoices"}
            </span>
          </div>
        )}
      </motion.div>

      {/* Section label */}
      <div className="flex items-center gap-2">
        <div className="h-px flex-1 bg-border/60" />
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground/60">
          Invoice History
        </h3>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        {isError ? (
          /* ── Error state ── */
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-red-300 bg-red-50/10 py-20 text-center shadow-sm backdrop-blur-sm">
            <div className="flex size-14 items-center justify-center rounded-xl bg-red-100/50">
              <FileText className="size-6 text-red-500" />
            </div>
            <div>
              <p className="text-lg font-medium text-foreground">
                Failed to load invoices
              </p>
              <p className="mt-1 font-mono text-sm text-red-500">
                {errorMessage}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => toast.info("Refreshing…")}
            >
              Try again
            </Button>
          </div>
        ) : filteredInvoices.length === 0 && !isLoading ? (
          /* ── Empty state ── */
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/10 py-24 text-center shadow-sm backdrop-blur-sm">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary/8 ring-1 ring-primary/15">
              <Receipt className="size-7 text-primary/60" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                No invoices found
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {statusFilter || datePreset !== "all"
                  ? "Try adjusting your filters."
                  : "Your invoices will appear here after your first payment."}
              </p>
            </div>
          </div>
        ) : (
          /* ── Invoice table ── */
          <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:shadow-md">
            <Table>
              <TableHeader>
                <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Invoice #
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Date
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                    Payment Ref
                  </TableHead>
                  <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                    Provider
                  </TableHead>
                  <TableHead className="text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Invoice
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableSkeletonRows count={8} />
                ) : (
                  filteredInvoices.map((invoice, idx) => (
                    <TableRow
                      key={invoice.id}
                      className={cn(
                        "transition-colors",
                        idx % 2 === 0 ? "" : "bg-muted/10"
                      )}
                    >
                      {/* Invoice number */}
                      <TableCell className="font-mono text-xs font-semibold text-foreground">
                        {invoice.invoiceNumber
                          ? invoice.invoiceNumber
                          : <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      {/* Date */}
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        <span title={new Date(invoice.createdAt).toLocaleString()}>
                          {fmtDate(invoice.createdAt)}
                        </span>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="tabular-nums font-semibold text-foreground">
                        {fmtCurrency(invoice.amount, invoice.currency)}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>

                      {/* Payment ref */}
                      <TableCell className="hidden md:table-cell">
                        {invoice.payment?.providerTransactionId ? (
                          <span
                            className="font-mono text-xs text-muted-foreground"
                            title={invoice.payment.providerTransactionId}
                          >
                            {truncate(invoice.payment.providerTransactionId, 22)}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Provider */}
                      <TableCell className="hidden sm:table-cell">
                        {invoice.payment?.provider ? (
                          <ProviderBadge provider={invoice.payment.provider} />
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Download */}
                      <TableCell className="text-right">
                        <DownloadButton invoice={invoice} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </motion.div>

      {/* Pagination */}
      {!isLoading && totalRecords > 0 && (
        <motion.div
          variants={itemVariants}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, totalRecords)}
            </span>{" "}
            of{" "}
            <span className="font-medium text-foreground">
              {totalRecords.toLocaleString()}
            </span>{" "}
            invoices
          </p>

          <div className="flex gap-1.5">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
            >
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const pageNum = i + 1;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="h-8 w-8 p-0 text-xs"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum}
                  </Button>
                );
              })}
              {totalPages > 5 && (
                <span className="px-1 text-muted-foreground">…</span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
            >
              Next
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
