"use client";

import { Plus, History, Wallet as WalletIcon, ChevronRight, MinusCircle, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface Transaction {
  id: string;
  type: string;
  amount: string;
  description?: string;
  createdAt: string;
}

import { Skeleton } from "@/components/ui/skeleton";

interface ActivityAndWalletProps {
  transactions: Transaction[];
  wallet: {
    currentBalance: string;
    totalCredits: string;
    totalUsage: string;
    totalRefunded: string;
    totalTransactions: string;
  };
  isLoading?: boolean;
}

export function ActivityAndWallet({ transactions, wallet, isLoading }: ActivityAndWalletProps) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Recent Activity */}
      <Card className="lg:col-span-8 transition-all hover:shadow-md border border-border/50 bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <History className="size-4 text-primary" />
              <CardTitle className="text-sm font-semibold text-foreground">Recent Activity</CardTitle>
            </div>
            <CardDescription className="text-xs text-muted-foreground">Your latest wallet transactions</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-t border-border/40">
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 bg-muted/40 hover:bg-transparent">
                <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Date</TableHead>
                <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Type</TableHead>
                <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Amount</TableHead>
                <TableHead className="py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-border/20">
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24 rounded-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-14 " /></TableCell>
                    <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  </TableRow>
                ))
              ) : transactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-32 text-center text-xs text-muted-foreground">No recent activity</TableCell>
                </TableRow>
              ) : (
                transactions.map((txn) => {
                  const isNegative = txn.type === "USAGE_DEDUCTION";
                  return (
                    <TableRow key={txn.id} className="border-border/10 hover:bg-muted/30">
                      <TableCell className="py-3">
                        <span className="text-xs text-foreground">
                          {new Date(txn.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                        <span className="block text-[10px] text-muted-foreground">
                          {new Date(txn.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </TableCell>
                      <TableCell className="py-3">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          isNegative ? "bg-rose-500/10 text-rose-600 dark:text-rose-400" : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        )}>
                          {txn.type.replace(/_/g, " ").toLowerCase()}
                        </span>
                      </TableCell>
                      <TableCell className={cn("py-3 text-xs font-bold tabular-nums", isNegative ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400")}>
                        {isNegative ? "-" : "+"}${parseFloat(txn.amount).toFixed(2)}
                      </TableCell>
                      <TableCell className="py-3 max-w-[220px] truncate text-xs text-muted-foreground">
                        {txn.description ?? "—"}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <a 
            href="/dashboard/credits"
            className="flex items-center justify-center gap-2 p-3 text-xs font-bold text-muted-foreground hover:text-foreground border-t border-border/40 hover:bg-muted/30 transition-all"
          >
            View all transactions
            <ChevronRight className="size-3.5" />
          </a>
        </CardContent>
      </Card>

      {/* Wallet Summary */}
      <Card className="lg:col-span-4 transition-all hover:shadow-md border border-border/50 bg-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-foreground">Wallet Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-4">
            <SummaryItem label="Current Balance" value={`$${wallet.currentBalance}`} icon={WalletIcon} color="text-muted-foreground" isLoading={isLoading} />
            <SummaryItem label="Total Credits Added" value={`$${wallet.totalCredits}`} icon={Plus} color="text-muted-foreground" isLoading={isLoading} />
            <SummaryItem label="Total Usage Deducted" value={`-$${wallet.totalUsage}`} icon={MinusCircle} color="text-rose-500" isLoading={isLoading} />
            <SummaryItem label="Total Refunded" value={`+$${wallet.totalRefunded}`} icon={RefreshCw} color="text-emerald-500" isLoading={isLoading} />
            <SummaryItem label="Total Transactions" value={`$${wallet.totalTransactions}`} icon={History} color="text-muted-foreground" isLoading={isLoading} />
          </div>
          <Button className="w-full h-10 rounded-xl bg-primary hover:bg-primary/90 text-xs font-bold transition-all hover:shadow-md hover:-translate-y-0.5">
            View wallet
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryItem({ label, value, icon: Icon, color, isLoading }: { label: string; value: string; icon: any; color: string; isLoading?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={cn("size-3.5", color)} />
        <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      </div>
      {isLoading ? (
        <Skeleton className="h-3 w-12" />
      ) : (
        <span className={cn("text-xs font-bold tabular-nums", value.startsWith("-") ? "text-rose-500" : value.startsWith("+") ? "text-emerald-500" : "text-foreground")}>
          {value}
        </span>
      )}
    </div>
  );
}


