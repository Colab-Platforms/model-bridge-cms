"use client";

import axios from "axios";
import { initializePaddle } from "@paddle/paddle-js";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery, useQueries } from "@tanstack/react-query";
import { CoinsIcon, ExternalLink, FileText } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UsageStackedBarChart } from "@/components/charts/UsageStackedBarChart";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";

// ── Types ─────────────────────────────────────────────────────────────────────

type TxType =
  | "TOPUP"
  | "CREDIT_GRANT"
  | "USAGE_DEDUCTION"
  | "REFUND"
  | "ADJUSTMENT";

interface CreditTransaction {
  id: string;
  type: TxType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdAt: string;
  usageLogId?: string | null;
  inferenceRequestId?: string | null;
}

type Preset = "7d" | "30d" | "90d" | "custom";
type BillingCurrency = "USD";

interface RecentUsageLog {
  modelId?: string | null;
  model?: {
    id?: string | null;
    displayName?: string | null;
  } | null;
  resolvedModelSlug?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<TxType, string> = {
  TOPUP:           "bg-green-100 text-green-700",
  CREDIT_GRANT:    "bg-blue-100 text-blue-700",
  USAGE_DEDUCTION: "bg-red-100 text-red-700",
  REFUND:          "bg-emerald-100 text-emerald-700",
  ADJUSTMENT:      "bg-amber-100 text-amber-700",
};

const TYPE_LABELS: Record<TxType, string> = {
  TOPUP:           "Top-up",
  CREDIT_GRANT:    "Grant",
  USAGE_DEDUCTION: "Deduction",
  REFUND:          "Refund",
  ADJUSTMENT:      "Adjustment",
};

function isCredit(tx: CreditTransaction): boolean {
  if (tx.type === "USAGE_DEDUCTION") return false;
  if (
    tx.type === "TOPUP" ||
    tx.type === "CREDIT_GRANT" ||
    tx.type === "REFUND"
  )
    return true;
  // ADJUSTMENT: follow the amount sign
  return parseFloat(tx.amount) >= 0;
}

function fmtUsd(raw: string) {
  const n = parseFloat(raw);
  if (isNaN(n)) return "—";
  const abs = Math.abs(n);
  const decimals = abs > 0 && abs < 0.0001 ? 8 : 4;
  return `$${abs.toFixed(decimals)}`;
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

function extractErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message ?? fallback;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

const PRESET_LABELS: { key: Preset; label: string }[] = [
  { key: "7d",     label: "7d" },
  { key: "30d",    label: "30d" },
  { key: "90d",    label: "90d" },
  { key: "custom", label: "Custom" },
];

const TOP_UP_PRESETS = ["10", "25", "50", "100", "250"];

// ── Chart helpers ─────────────────────────────────────────────────────────────

const CHART_PALETTE = [
  "var(--color-indigo-500)",
  "var(--color-violet-500)",
  "var(--color-emerald-500)",
  "var(--color-sky-500)",
  "var(--color-pink-500)",
  "var(--color-amber-500)",
  "var(--color-rose-500)",
  "var(--color-blue-500)",
];

function getDateRangeParams(preset: Preset, customStart: string, customEnd: string) {
  if (preset === "7d")  return { dateRangePreset: "past_7d" };
  if (preset === "30d") return { dateRangePreset: "past_30d" };
  if (preset === "custom") {
    return {
      dateRangePreset: "custom",
      from: customStart ? `${customStart}T00:00:00.000Z` : undefined,
      to:   customEnd   ? `${customEnd}T23:59:59.000Z`   : undefined,
    };
  }
  // 90d: backend has no past_90d preset, so compute explicit dates
  const end   = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 90);
  return { dateRangePreset: "custom", from: start.toISOString(), to: end.toISOString() };
}

type TimeseriesBucket = {
  bucket:      string;
  totalCost:   string;
  requests:    number;
  totalTokens: number;
};

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

function mergeTimeseries(
  entries: Array<{ id: string; series: TimeseriesBucket[] }>
): DataPoint[] {
  const map = new Map<string, DataPoint>();
  const ids = entries.map(e => e.id);

  for (const { id, series } of entries) {
    for (const point of series) {
      const date = point.bucket.split("T")[0];
      if (!map.has(date)) {
        const entry: DataPoint = { date };
        ids.forEach(i => {
          entry[`${i}_spend`]    = 0;
          entry[`${i}_requests`] = 0;
          entry[`${i}_tokens`]   = 0;
        });
        map.set(date, entry);
      }
      const entry = map.get(date)!;
      entry[`${id}_spend`]    = parseFloat(point.totalCost) || 0;
      entry[`${id}_requests`] = point.requests    || 0;
      entry[`${id}_tokens`]   = point.totalTokens || 0;
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

// ── TopUpModal ────────────────────────────────────────────────────────────────

function TopUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState("");
  const [currency] = useState<BillingCurrency>("USD");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reset = () => {
    setAmount("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const n = parseFloat(amount);

    if (!n || n <= 0) {
      setError("Enter a valid amount greater than 0.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await api.post("/billing/create-checkout", {
        amount: n.toFixed(2),
        currency,
      });
      const checkoutUrl = response.data?.checkoutUrl as string | undefined;

      if (!checkoutUrl) {
        throw new Error("Checkout URL not returned");
      }

      toast.success("Redirecting to secure checkout...");
      window.location.assign(checkoutUrl);
    } catch (err: unknown) {
      const message = extractErrorMessage(
        err,
        "Failed to start checkout. Please try again."
      );
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Credits</DialogTitle>
          <DialogDescription>
            Choose an amount and continue to secure checkout.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Quick amounts</label>
            <div className="grid grid-cols-3 gap-2">
              {TOP_UP_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={cn(
                    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    amount === preset
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-background text-foreground hover:bg-accent"
                  )}
                >
                  ${preset}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Amount (USD)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <input
                type="number"
                min="5"
                step="0.01"
                placeholder="10.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-background pl-7 pr-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
              />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 text-xs text-muted-foreground">
            Your wallet will be credited only after payment confirmation, and an invoice will be generated automatically.
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Redirecting..." : "Continue to Checkout"}
            </Button>
          </div>
        </form>
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
        "h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:border-ring cursor-pointer",
        className
      )}
    >
      {children}
    </select>
  );
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function CreditsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [topUpOpen, setTopUpOpen]     = useState(false);
  const [typeFilter, setTypeFilter]   = useState("");
  const [preset, setPreset]           = useState<Preset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd]     = useState("");
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);
  const checkoutTxnId = searchParams.get("_ptxn");
  const checkoutStatus = searchParams.get("checkout");
  const openedCheckoutRef = useRef<string | null>(null);

  const cleanupCheckoutParams = useMemo(
    () => () => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("_ptxn");
      nextParams.delete("checkout");

      const nextQuery = nextParams.toString();
      router.replace(nextQuery ? `/dashboard/credits?${nextQuery}` : "/dashboard/credits");
    },
    [router, searchParams]
  );

  useEffect(() => {
    if (checkoutStatus !== "success") return;

    toast.success("Payment submitted. Your wallet will update after Paddle confirms the payment.");
    cleanupCheckoutParams();
  }, [checkoutStatus, cleanupCheckoutParams]);

  useEffect(() => {
    if (!checkoutTxnId || openedCheckoutRef.current === checkoutTxnId) return;

    const paddleToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

    if (!paddleToken) {
      toast.error("Missing Paddle client token. Set NEXT_PUBLIC_PADDLE_CLIENT_TOKEN in the frontend environment.");
      return;
    }

    const paddleEnvironment =
      (process.env.NEXT_PUBLIC_PADDLE_ENV ?? "production").toLowerCase() === "sandbox"
        ? "sandbox"
        : "production";

    let cancelled = false;
    openedCheckoutRef.current = checkoutTxnId;

    const openCheckout = async () => {
      try {
        const paddle = await initializePaddle({
          token: paddleToken,
          environment: paddleEnvironment,
          eventCallback: (event) => {
            if (event.name === "checkout.closed") {
              cleanupCheckoutParams();
            }
          },
        });

        if (cancelled || !paddle) {
          return;
        }

        paddle.Checkout.open({
          transactionId: checkoutTxnId,
          settings: {
            displayMode: "overlay",
            theme: "light",
            locale: "en",
            successUrl: `${window.location.origin}/dashboard/credits?checkout=success`,
          },
        });
      } catch (error) {
        openedCheckoutRef.current = null;
        toast.error(
          extractErrorMessage(
            error,
            "Unable to open Paddle checkout. Please try again."
          )
        );
      }
    };

    void openCheckout();

    return () => {
      cancelled = true;
    };
  }, [checkoutTxnId, cleanupCheckoutParams]);

  const dateRange = useMemo(() => {
    if (preset === "custom") return { startDate: customStart, endDate: customEnd };
    const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
    return presetDates(days);
  }, [preset, customStart, customEnd]);

  // ── Balance query ──────────────────────────────────────────────────────────

  const { data: balanceData, isLoading: balanceLoading } = useQuery<{
    balance: string;
  }>({
    queryKey: ["wallet-balance"],
    queryFn: () => api.get("/wallets/balance").then((r) => r.data),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  // Sync live balance into authStore → sidebar badge updates automatically
  useEffect(() => {
    if (!balanceData) return;
    const { user, setUser } = useAuthStore.getState();
    if (user) setUser({ ...user, creditBalance: parseFloat(balanceData.balance) });
  }, [balanceData]);

  // ── Transactions query (fetch all, filter client-side) ────────────────────

  const { data: rawTxData, isLoading, isError, error } = useQuery<CreditTransaction[]>({
    queryKey: ["wallet-transactions"],
    queryFn: () =>
      api
        .get("/wallets/transactions", { params: { limit: 100 } })
        .then((r) => {
          const raw = r.data;
          if (Array.isArray(raw)) return raw as CreditTransaction[];
          if (raw && Array.isArray(raw.data)) return raw.data as CreditTransaction[];
          return [] as CreditTransaction[];
        }),
    staleTime: 0,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // ── Chart queries ──────────────────────────────────────────────────────────

  const activeProject = useProjectStore(s => s.activeProject);
  const projects      = useProjectStore(s => s.projects);

  const dateRangeParams = useMemo(
    () => getDateRangeParams(preset, customStart, customEnd),
    [preset, customStart, customEnd]
  );

  // Keys for the active project (reuses the same cache as the keys page)
  const { data: keysData = [] } = useQuery<Array<{ id: string; name: string; status: string }>>({
    queryKey: ["keys", activeProject?.id],
    queryFn:  () => api.get("/api-keys", { params: { projectId: activeProject?.id } }).then(r => r.data),
    enabled:  !!activeProject,
    staleTime: 5 * 60_000,
  });

  const topKeys = useMemo(
    () => keysData.filter(k => k.status === "ACTIVE").slice(0, 5),
    [keysData]
  );

  // ── Client-side filtering by date range and type
  const filteredTxs = useMemo(() => {
    const all = rawTxData ?? [];
    return all.filter((tx) => {
      if (typeFilter && tx.type !== typeFilter) return false;
      if (dateRange.startDate && tx.createdAt < `${dateRange.startDate}T00:00:00`) return false;
      if (dateRange.endDate   && tx.createdAt > `${dateRange.endDate}T23:59:59`)   return false;
      return true;
    });
  }, [rawTxData, typeFilter, dateRange]);

  const total      = filteredTxs.length;
  const totalPages = Math.ceil(total / limit);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const txs        = filteredTxs.slice((currentPage - 1) * limit, currentPage * limit);

  // Parallel timeseries — one call per active key
  const keyTimeseriesResults = useQueries({
    queries: topKeys.map(key => ({
      queryKey: ["timeseries-key", key.id, dateRangeParams],
      queryFn:  () =>
        api.get("/usage/timeseries", {
          params: { ...dateRangeParams, apiKeyId: key.id, projectId: activeProject?.id, granularity: "day" },
        }).then(r => (r.data.series ?? []) as TimeseriesBucket[]),
      enabled:   !!activeProject,
      staleTime: 5 * 60_000,
    })),
  });

  // Parallel timeseries — one call per project
  const projectTimeseriesResults = useQueries({
    queries: projects.map(proj => ({
      queryKey: ["timeseries-project", proj.id, dateRangeParams],
      queryFn:  () =>
        api.get("/usage/timeseries", {
          params: { ...dateRangeParams, projectId: proj.id, granularity: "day" },
        }).then(r => (r.data.series ?? []) as TimeseriesBucket[]),
      staleTime: 5 * 60_000,
    })),
  });

  // Fetch a recent sample of logs to discover which models were used
  const { data: recentLogsData } = useQuery({
    queryKey: ["recent-logs-models", activeProject?.id, dateRangeParams],
    queryFn:  () =>
      api.get("/usage/logs", {
        params: { ...dateRangeParams, projectId: activeProject?.id, pageSize: 100 },
      }).then(r => r.data),
    enabled:   !!activeProject,
    staleTime: 5 * 60_000,
  });

  const topModels = useMemo(() => {
    const logs = (recentLogsData?.data ?? []) as RecentUsageLog[];
    const seen = new Map<string, { id: string; displayName: string }>();
    for (const log of logs) {
      const id = log.modelId ?? log.model?.id ?? null;
      const displayName =
        log.model?.displayName ??
        log.resolvedModelSlug ??
        id ??
        "Unknown model";

      if (id && !seen.has(id)) {
        seen.set(id, { id, displayName });
      }
    }
    return Array.from(seen.values()).slice(0, 5);
  }, [recentLogsData]);

  // Parallel timeseries — one call per discovered model
  const modelTimeseriesResults = useQueries({
    queries: topModels.map(model => ({
      queryKey: ["timeseries-model", model.id, dateRangeParams],
      queryFn:  () =>
        api.get("/usage/timeseries", {
          params: { ...dateRangeParams, modelId: model.id, projectId: activeProject?.id, granularity: "day" },
        }).then(r => (r.data.series ?? []) as TimeseriesBucket[]),
      enabled:   topModels.length > 0,
      staleTime: 5 * 60_000,
    })),
  });

  // Merge parallel results into the shape UsageStackedBarChart expects
  const keyChartData = useMemo(() => {
    if (!topKeys.length) return [];
    return mergeTimeseries(
      topKeys.map((key, i) => ({ id: key.id, series: keyTimeseriesResults[i]?.data ?? [] }))
    );
  }, [topKeys, keyTimeseriesResults]);

  const keyCategories = useMemo(() =>
    topKeys.map((key, i) => ({
      id:    key.id,
      label: key.name,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    })),
  [topKeys]);

  const projectChartData = useMemo(() => {
    if (!projects.length) return [];
    return mergeTimeseries(
      projects.map((proj, i) => ({ id: proj.id, series: projectTimeseriesResults[i]?.data ?? [] }))
    );
  }, [projects, projectTimeseriesResults]);

  const projectCategories = useMemo(() =>
    projects.map((proj, i) => ({
      id:    proj.id,
      label: proj.name,
      color: CHART_PALETTE[(i + 2) % CHART_PALETTE.length],
    })),
  [projects]);

  const modelChartData = useMemo(() => {
    if (!topModels.length) return [];
    return mergeTimeseries(
      topModels.map((model, i) => ({ id: model.id, series: modelTimeseriesResults[i]?.data ?? [] }))
    );
  }, [topModels, modelTimeseriesResults]);

  const modelCategories = useMemo(() =>
    topModels.map((model, i) => ({
      id:    model.id,
      label: model.displayName,
      color: CHART_PALETTE[(i + 4) % CHART_PALETTE.length],
    })),
  [topModels]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Page header */}
      <motion.div variants={itemVariants}>
        <h2 className="text-2xl font-bold tracking-tight text-foreground/90">Credits &amp; Wallet</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your balance and view transaction history.
        </p>
      </motion.div>

      {/* Hero balance card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-gradient-to-br from-primary/10 via-background to-background rounded-2xl overflow-hidden border-border/40 shadow-sm transition-all hover:shadow-md">
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
                  ${parseFloat(balanceData?.balance ?? "0").toFixed(7)}
                </p>
              )}
              <p className="mt-1 text-xs text-muted-foreground font-medium">USD</p>
            </div>
            <Button onClick={() => setTopUpOpen(true)} className="transition-all hover:shadow-md hover:-translate-y-0.5">Add Credits</Button>
          </CardContent>
        </Card>
      </motion.div>


      {/* Usage Analytics Section */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <UsageStackedBarChart
          title="Models"
          description="Spend distribution by model"
          data={modelChartData}
          categories={modelCategories}
        />
        <UsageStackedBarChart
          title="API Keys"
          description="Usage by top keys"
          data={keyChartData}
          categories={keyCategories}
        />
        <UsageStackedBarChart
          title="Apps"
          description="Project-level spend"
          data={projectChartData}
          categories={projectCategories}
        />
      </motion.div>

        {/* Filter bar */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-end gap-3 rounded-xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm">
        {/* Date presets */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">
            Date range
          </span>
          <div className="flex overflow-hidden rounded-lg border border-border">
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
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
                className="h-9 rounded-lg border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
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
            <option value="TOPUP">Top-up</option>
            <option value="CREDIT_GRANT">Grant</option>
            <option value="USAGE_DEDUCTION">Deduction</option>
            <option value="REFUND">Refund</option>
            <option value="ADJUSTMENT">Adjustment</option>
          </FilterSelect>
        </div>
      </motion.div>

      <div className="flex items-center gap-2 pt-4">
        <div className="h-px flex-1 bg-border/60" />
        <h3 className="text-xs font-bold uppercase tracking-[0.3em] text-muted-foreground/60">Transaction History</h3>
        <div className="h-px flex-1 bg-border/60" />
      </div>

      {/* Transaction table */}
      <motion.div variants={itemVariants}>
      {isLoading ? (
        <div className="space-y-2 rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md p-4 shadow-sm">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-lg" />
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-red-300 bg-red-50/10 py-20 text-center shadow-sm backdrop-blur-sm">
          <div className="flex size-14 items-center justify-center rounded-xl bg-red-100/50">
            <FileText className="size-6 text-red-500" />
          </div>
          <div>
            <p className="font-medium text-foreground text-lg">Failed to load transactions</p>
            <p className="mt-1 text-sm text-red-500 font-mono">
              {extractErrorMessage(error, "Unknown error — check browser console")}
            </p>
          </div>
        </div>
      ) : txs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border bg-muted/10 py-20 text-center shadow-sm backdrop-blur-sm">
          <div className="flex size-14 items-center justify-center rounded-xl bg-muted/50">
            <FileText className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground text-lg">No transactions found</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting your filters or date range.
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-500 hover:shadow-md">
          <Table>
            <TableHeader>
              <TableRow className="border-b border-border/60 bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</TableHead>
                <TableHead className=" text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</TableHead>
                <TableHead className=" text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance Before</TableHead>
                <TableHead className=" text-xs font-semibold uppercase tracking-wider text-muted-foreground">Balance After</TableHead>
                <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</TableHead>
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
                          "inline-flex items-center rounded-none px-2 py-0.5 text-xs font-medium",
                          TYPE_STYLES[tx.type]
                        )}
                      >
                        {TYPE_LABELS[tx.type]}
                      </span>
                    </TableCell>

                    <TableCell
                      className={cn(
                        " tabular-nums font-medium",
                        credit ? "text-green-600" : "text-red-500"
                      )}
                    >
                      {credit ? "+" : "-"}
                      {fmtUsd(tx.amount)}
                    </TableCell>

                    <TableCell className=" tabular-nums text-muted-foreground">
                      {fmtUsd(tx.balanceBefore)}
                    </TableCell>

                    <TableCell className=" tabular-nums text-muted-foreground">
                      {fmtUsd(tx.balanceAfter)}
                    </TableCell>

                    <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                      {tx.description ?? "—"}
                    </TableCell>

                    <TableCell>
                      {(tx.usageLogId ?? tx.inferenceRequestId) && (
                        <button
                          onClick={() =>
                            router.push(
                              `/dashboard/usage?requestId=${tx.usageLogId ?? tx.inferenceRequestId}`
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
      </motion.div>

      {/* Pagination */}
      {!isLoading && total > 0 && (
        <motion.div variants={itemVariants} className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">
              {(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, total)}
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
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, Math.max(totalPages, 1)))}
              >
                Next
              </Button>
            </div>
          </div>
        </motion.div>
      )}

      <TopUpModal open={topUpOpen} onClose={() => setTopUpOpen(false)} />
    </motion.div>
  );
}
