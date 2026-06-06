"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CoinsIcon, ExternalLink, FileText } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type TxType =
  | "CREDIT_PURCHASE"
  | "CREDIT_GRANT"
  | "USAGE_DEDUCTION"
  | "REFUND"
  | "ADJUSTMENT";

interface CreditTransaction {
  id: string;
  type: TxType;
  amountUsd: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
  usageLogId: string | null;
}

interface TransactionsResponse {
  data: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
}

type Preset = "7d" | "30d" | "90d" | "custom";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SUPPORT_EMAIL = "support@modelbridge.ai";

const TYPE_STYLES: Record<TxType, string> = {
  CREDIT_PURCHASE: "bg-green-100 text-green-700",
  CREDIT_GRANT:    "bg-blue-100 text-blue-700",
  USAGE_DEDUCTION: "bg-red-100 text-red-700",
  REFUND:          "bg-emerald-100 text-emerald-700",
  ADJUSTMENT:      "bg-amber-100 text-amber-700",
};

const TYPE_LABELS: Record<TxType, string> = {
  CREDIT_PURCHASE: "Purchase",
  CREDIT_GRANT:    "Grant",
  USAGE_DEDUCTION: "Deduction",
  REFUND:          "Refund",
  ADJUSTMENT:      "Adjustment",
};

function isCredit(tx: CreditTransaction): boolean {
  if (tx.type === "USAGE_DEDUCTION") return false;
  if (
    tx.type === "CREDIT_PURCHASE" ||
    tx.type === "CREDIT_GRANT" ||
    tx.type === "REFUND"
  )
    return true;
  // ADJUSTMENT: follow the amount sign
  return parseFloat(tx.amountUsd) >= 0;
}

function fmtUsd(raw: string) {
  const n = parseFloat(raw);
  if (isNaN(n)) return "—";
  return `$${Math.abs(n).toFixed(4)}`;
}

function fmtDate(ts: string) {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

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
  { key: "7d",     label: "7d" },
  { key: "30d",    label: "30d" },
  { key: "90d",    label: "90d" },
  { key: "custom", label: "Custom" },
];

// ── TopUpModal ────────────────────────────────────────────────────────────────

function TopUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
          <DialogDescription>
            To add credits to your account, please contact our support team.
            Stripe integration is coming soon.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5">
          <span className="flex-1 font-mono text-sm text-foreground">
            {SUPPORT_EMAIL}
          </span>
          <Button variant="outline" size="sm" onClick={copy} className="shrink-0">
            {copied ? "Copied!" : "Copy"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── FilterSelect ──────────────────────────────────────────────────────────────

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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const router = useRouter();

  const [topUpOpen, setTopUpOpen]     = useState(false);
  const [typeFilter, setTypeFilter]   = useState("");
  const [preset, setPreset]           = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, preset, customStart, customEnd, limit]);

  // ── Balance query ──────────────────────────────────────────────────────────

  const { data: balanceData, isLoading: balanceLoading } = useQuery<{
    balance: string;
  }>({
    queryKey: ["credits-balance"],
    queryFn: () => api.get("/api/v1/credits/balance").then((r) => r.data),
  });

  // Sync live balance into authStore → sidebar badge updates automatically
  useEffect(() => {
    if (!balanceData) return;
    const { user, setUser } = useAuthStore.getState();
    if (user) setUser({ ...user, creditBalance: parseFloat(balanceData.balance) });
  }, [balanceData]);

  // ── Transactions query ─────────────────────────────────────────────────────

  const queryParams = useMemo(() => {
    const p: Record<string, string | number> = { page, limit };
    if (dateRange.startDate) p.startDate = dateRange.startDate;
    if (dateRange.endDate)   p.endDate   = dateRange.endDate;
    if (typeFilter)          p.type      = typeFilter;
    return p;
  }, [page, limit, dateRange, typeFilter]);

  const { data, isLoading } = useQuery<TransactionsResponse>({
    queryKey: ["credits-transactions", queryParams],
    queryFn: () =>
      api
        .get("/api/v1/credits/transactions", { params: queryParams })
        .then((r) => r.data),
  });

  const txs        = data?.data ?? [];
  const total      = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h2 className="text-lg font-semibold text-foreground">Credits &amp; Wallet</h2>
        <p className="text-sm text-muted-foreground">
          Manage your balance and view transaction history.
        </p>
      </div>

      {/* Hero balance card */}
      <Card className="bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <CoinsIcon className="size-4" />
            Available Balance
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-end justify-between gap-4">
          <div>
            {balanceLoading ? (
              <Skeleton className="h-10 w-36 rounded-lg" />
            ) : (
              <p className="text-4xl font-bold tracking-tight text-foreground">
                ${parseFloat(balanceData?.balance ?? "0").toFixed(2)}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">USD</p>
          </div>
          <Button onClick={() => setTopUpOpen(true)}>Add Credits</Button>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-card p-4">
        {/* Date presets */}
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

        <div className="hidden h-8 w-px bg-border sm:block" />

        {/* Type filter */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Type
          </span>
          <FilterSelect value={typeFilter} onChange={setTypeFilter}>
            <option value="">All types</option>
            <option value="CREDIT_PURCHASE">Purchase</option>
            <option value="CREDIT_GRANT">Grant</option>
            <option value="USAGE_DEDUCTION">Deduction</option>
            <option value="REFUND">Refund</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </FilterSelect>
        </div>
      </div>

      {/* Transaction table */}
      {isLoading ? (
        <div className="space-y-2 rounded-2xl border border-border p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-xl" />
          ))}
        </div>
      ) : txs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/20 py-20 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No transactions found</p>
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
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Balance Before</TableHead>
                <TableHead className="text-right">Balance After</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="w-8" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.map((tx) => {
                const credit = isCredit(tx);
                return (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {fmtDate(tx.createdAt)}
                    </TableCell>

                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          TYPE_STYLES[tx.type]
                        )}
                      >
                        {TYPE_LABELS[tx.type]}
                      </span>
                    </TableCell>

                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-medium",
                        credit ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {credit ? "+" : "-"}
                      {fmtUsd(tx.amountUsd)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmtUsd(tx.balanceBefore)}
                    </TableCell>

                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmtUsd(tx.balanceAfter)}
                    </TableCell>

                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {tx.description ?? "—"}
                    </TableCell>

                    <TableCell>
                      {tx.usageLogId && (
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/usage?requestId=${tx.usageLogId}`
                            )
                          }
                          title="View usage log"
                          className="text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ExternalLink className="size-3.5" />
                        </button>
                      )}
                    </TableCell>
                  </TableRow>
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
        </div>
      )}

      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </div>
  );
}
