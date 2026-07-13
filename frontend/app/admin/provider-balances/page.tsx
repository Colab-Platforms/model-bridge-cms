"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bell,
  Coins,
  History,
  Pencil,
  Plus,
  RefreshCcw,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";

import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ProviderBalance = {
  id: string;
  providerId: string;
  currentBalance: string;
  currency: string;
  lowBalanceThreshold: string;
  alertsEnabled: boolean;
  lowBalanceAlertActive: boolean;
  lastAlertSentAt: string | null;
  lastAlertResolvedAt: string | null;
  isBelowThreshold: boolean;
  provider: {
    id: string;
    slug: string | null;
    displayName: string | null;
    isActive: boolean;
  };
};

type ProviderBalanceLedgerItem = {
  id: string;
  inferenceRequestId: string | null;
  referenceId: string | null;
  type: "RECHARGE" | "USAGE_DEDUCTION" | "REFUND" | "ADJUSTMENT";
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  description: string | null;
  createdBy: string | null;
  createdAt: string;
};

type ProviderBalanceLedgerResponse = {
  data: ProviderBalanceLedgerItem[];
  pagination?: {
    totalRecords: number;
    totalPages: number;
    page: number;
    pageSize: number;
  };
};

type MutationMode = "recharge" | "adjust" | "settings";

const fmtUsd = (value: string | number) => `$${Number(value).toFixed(4)}`;

const fmtDateTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      })
    : "—";

const getProviderLabel = (item: ProviderBalance) =>
  item.provider.displayName ?? item.provider.slug ?? item.provider.id;

function StatCard({
  title,
  value,
  subValue,
  icon: Icon,
  loading,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  return (
    <Card className="rounded-none">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24 rounded-none" />
        ) : (
          <>
            <p className="text-2xl font-bold">{value}</p>
            {subValue ? <p className="mt-1 text-xs text-muted-foreground">{subValue}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProviderBalanceFormDialog({
  mode,
  balance,
  open,
  onClose,
}: {
  mode: MutationMode;
  balance: ProviderBalance | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [referenceId, setReferenceId] = useState("");
  const [threshold, setThreshold] = useState(balance?.lowBalanceThreshold ?? "");
  const [currency, setCurrency] = useState(balance?.currency ?? "USD");
  const [alertsEnabled, setAlertsEnabled] = useState(balance?.alertsEnabled ?? true);
  const [error, setError] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      if (!balance) {
        throw new Error("Provider balance not selected");
      }

      if (mode === "recharge") {
        return api.post(`/admin/provider-balances/${balance.providerId}/recharge`, {
          amount,
          description,
          referenceId,
        });
      }

      if (mode === "adjust") {
        return api.post(`/admin/provider-balances/${balance.providerId}/adjust`, {
          amount,
          description,
          referenceId,
        });
      }

      return api.patch(`/admin/provider-balances/${balance.providerId}/settings`, {
        lowBalanceThreshold: threshold,
        currency,
        alertsEnabled,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-provider-balances"] });
      if (balance) {
        queryClient.invalidateQueries({ queryKey: ["admin-provider-balance-ledger", balance.providerId] });
      }
      toast.success(
        mode === "recharge"
          ? "Provider balance recharged"
          : mode === "adjust"
          ? "Provider balance adjusted"
          : "Provider balance settings updated"
      );
      onClose();
    },
    onError: (err: unknown) => {
      const errorMessage =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message ===
          "string"
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : err instanceof Error
          ? err.message
          : "Something went wrong";

      setError(errorMessage);
    },
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (mode !== "settings" && !amount.trim()) {
      setError("Amount is required.");
      return;
    }

    if (mode === "settings" && !threshold.trim()) {
      setError("Threshold is required.");
      return;
    }

    mutation.mutate();
  };

  const title =
    mode === "recharge"
      ? "Recharge Provider Balance"
      : mode === "adjust"
      ? "Adjust Provider Balance"
      : "Edit Provider Balance Settings";

  const descriptionText =
    mode === "recharge"
      ? "Add a manual top-up entry to this provider ledger."
      : mode === "adjust"
      ? "Apply a signed correction. Use a negative value to reduce the tracked balance."
      : "Update threshold, currency, and alert behavior for this provider.";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-md rounded-none">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{descriptionText}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "settings" ? (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="threshold">Low Balance Threshold</Label>
                <Input
                  id="threshold"
                  className="rounded-none"
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="5"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="currency">Currency</Label>
                <Input
                  id="currency"
                  className="rounded-none"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  placeholder="USD"
                />
              </div>
              <div className="flex items-center justify-between rounded-none border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Alerts Enabled</p>
                  <p className="text-xs text-muted-foreground">
                    Send admin alerts when balance drops below threshold.
                  </p>
                </div>
                <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} />
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Amount</Label>
                <Input
                  id="amount"
                  className="rounded-none"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={mode === "adjust" ? "-10 or 25" : "500"}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="referenceId">Reference ID</Label>
                <Input
                  id="referenceId"
                  className="rounded-none"
                  value={referenceId}
                  onChange={(e) => setReferenceId(e.target.value)}
                  placeholder="Invoice or top-up reference"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  className="rounded-none"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional note"
                />
              </div>
            </div>
          )}

          {error ? <p className="text-sm text-red-500">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-none"
              onClick={onClose}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-none" disabled={mutation.isPending}>
              {mutation.isPending ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ProviderBalanceLedgerDialog({
  balance,
  open,
  onClose,
}: {
  balance: ProviderBalance | null;
  open: boolean;
  onClose: () => void;
}) {
  const { data, isLoading } = useQuery<ProviderBalanceLedgerResponse>({
    queryKey: ["admin-provider-balance-ledger", balance?.providerId],
    queryFn: () =>
      api
        .get(`/admin/provider-balances/${balance!.providerId}/ledger`, {
          params: { page: 1, pageSize: 20 },
        })
        .then((response) => response.data),
    enabled: open && !!balance,
  });

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] rounded-none sm:!max-w-[98vw]">
        <DialogHeader>
          <DialogTitle>Ledger History</DialogTitle>
          <DialogDescription>
            {balance ? `Recent transactions for ${getProviderLabel(balance)}` : "Provider ledger"}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[70vh] overflow-auto rounded-none border border-border">
          <Table className="w-full table-auto">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wider">Date</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Type</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Amount</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Before</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">After</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Reference</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full rounded-none" />
                      </TableCell>
                    </TableRow>
                  ))
                : (data?.data ?? []).length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        No ledger transactions yet.
                      </TableCell>
                    </TableRow>
                  )
                : (data?.data ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDateTime(item.createdAt)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="rounded-none">
                          {item.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtUsd(item.amount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {fmtUsd(item.balanceBefore)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {fmtUsd(item.balanceAfter)}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.referenceId ?? item.inferenceRequestId ?? "—"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.description ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminProviderBalancesPage() {
  const queryClient = useQueryClient();
  const [selectedBalance, setSelectedBalance] = useState<ProviderBalance | null>(null);
  const [dialogMode, setDialogMode] = useState<MutationMode | null>(null);
  const [ledgerOpen, setLedgerOpen] = useState(false);

  const { data: balances = [], isLoading, refetch, isFetching } = useQuery<ProviderBalance[]>({
    queryKey: ["admin-provider-balances"],
    queryFn: () => api.get("/admin/provider-balances").then((response) => response.data),
    staleTime: 60_000,
  });

  const recoverableCount = balances.filter((item) => item.lowBalanceAlertActive).length;
  const belowThresholdCount = balances.filter((item) => item.isBelowThreshold).length;
  const totalTrackedBalance = balances.reduce(
    (sum, item) => sum + Number(item.currentBalance ?? 0),
    0
  );

  const settingsToggleMutation = useMutation({
    mutationFn: ({
      providerId,
      alertsEnabled,
      threshold,
      currency,
    }: {
      providerId: string;
      alertsEnabled: boolean;
      threshold: string;
      currency: string;
    }) =>
      api.patch(`/admin/provider-balances/${providerId}/settings`, {
        alertsEnabled,
        lowBalanceThreshold: threshold,
        currency,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-provider-balances"] });
      toast.success("Alert setting updated");
    },
    onError: () => toast.error("Failed to update alert setting"),
  });

  return (
    <div className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Provider Balances</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track internal provider credit, monitor thresholds, and review ledger history.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-1.5 rounded-none"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCcw className={cn("size-4", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Tracked Providers"
          value={balances.length}
          subValue="Internal ledger enabled"
          icon={Wallet}
          loading={isLoading}
        />
        <StatCard
          title="Total Balance"
          value={fmtUsd(totalTrackedBalance)}
          subValue="Across all providers"
          icon={Coins}
          loading={isLoading}
        />
        <StatCard
          title="Below Threshold"
          value={belowThresholdCount}
          subValue="Need recharge attention"
          icon={AlertTriangle}
          loading={isLoading}
        />
        <StatCard
          title="Active Alerts"
          value={recoverableCount}
          subValue="Already notified admins"
          icon={Bell}
          loading={isLoading}
        />
      </div>

      <Card className="rounded-none">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Provider Credit Ledger</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Recharge providers manually and let usage deductions happen automatically.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wider">Provider</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Balance</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Threshold</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-center">Alerts</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Last Alert</TableHead>
                <TableHead className="w-[240px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 6 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={7}>
                        <Skeleton className="h-5 w-full rounded-none" />
                      </TableCell>
                    </TableRow>
                  ))
                : balances.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-16 text-center text-sm text-muted-foreground">
                        No provider balances found yet.
                      </TableCell>
                    </TableRow>
                  )
                : balances.map((balance) => (
                    <TableRow key={balance.id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{getProviderLabel(balance)}</p>
                          <p className="text-xs text-muted-foreground">
                            {balance.provider.slug ?? balance.provider.id}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtUsd(balance.currentBalance)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmtUsd(balance.lowBalanceThreshold)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-center">
                          <Switch
                            checked={balance.alertsEnabled}
                            onCheckedChange={(checked) =>
                              settingsToggleMutation.mutate({
                                providerId: balance.providerId,
                                alertsEnabled: checked,
                                threshold: balance.lowBalanceThreshold,
                                currency: balance.currency,
                              })
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "rounded-none",
                            balance.isBelowThreshold
                              ? "bg-red-100 text-red-700 hover:bg-red-100"
                              : "bg-green-100 text-green-700 hover:bg-green-100"
                          )}
                        >
                          {balance.isBelowThreshold ? "Low Balance" : "Healthy"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {fmtDateTime(balance.lastAlertSentAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none"
                            onClick={() => {
                              setSelectedBalance(balance);
                              setLedgerOpen(true);
                            }}
                          >
                            <History className="mr-1.5 size-3.5" />
                            Ledger
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-none"
                            onClick={() => {
                              setSelectedBalance(balance);
                              setDialogMode("recharge");
                            }}
                          >
                            <Plus className="mr-1.5 size-3.5" />
                            Recharge
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-none"
                            onClick={() => {
                              setSelectedBalance(balance);
                              setDialogMode("adjust");
                            }}
                          >
                            Adjust
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 rounded-none"
                            onClick={() => {
                              setSelectedBalance(balance);
                              setDialogMode("settings");
                            }}
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ProviderBalanceFormDialog
        key={`${dialogMode ?? "closed"}-${selectedBalance?.providerId ?? "none"}`}
        mode={dialogMode ?? "settings"}
        balance={selectedBalance}
        open={dialogMode !== null}
        onClose={() => {
          setDialogMode(null);
          setSelectedBalance(null);
        }}
      />

      <ProviderBalanceLedgerDialog
        balance={selectedBalance}
        open={ledgerOpen}
        onClose={() => {
          setLedgerOpen(false);
          setSelectedBalance(null);
        }}
      />
    </div>
  );
}
