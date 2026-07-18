"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  LifeBuoy,
  Search,
  Paperclip,
  ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

type TicketCategory = "BILLING" | "TECHNICAL" | "ACCOUNT" | "OTHER";
type TicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

interface SupportTicket {
  id: string;
  referenceNumber: string;
  category: TicketCategory;
  subject: string;
  description: string;
  status: TicketStatus;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; firstName: string | null; lastName: string | null };
}

const CATEGORY_LABELS: Record<TicketCategory, string> = {
  BILLING: "Billing & credits",
  TECHNICAL: "Technical / API",
  ACCOUNT: "Account & security",
  OTHER: "Other",
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800",
  IN_PROGRESS: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800",
  RESOLVED: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800",
  CLOSED: "bg-zinc-100 text-zinc-500 border border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-400 dark:border-zinc-700",
};

function StatusPill({ status }: { status: TicketStatus }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium", STATUS_STYLES[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

function getUserDisplayName(user: SupportTicket["user"]) {
  const full = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim();
  return full || user.email;
}

function TicketDetailSheet({
  ticket,
  open,
  onClose,
}: {
  ticket: SupportTicket | null;
  open: boolean;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const { mutate: updateStatus, isPending } = useMutation({
    mutationFn: (status: TicketStatus) =>
      api.patch(`/admin/support/${ticket!.id}/status`, { status }).then((r) => r.data),
    onSuccess: () => {
      toast.success("Ticket status updated");
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
    },
    onError: (err: any) => toast.error(err?.response?.data?.message ?? "Failed to update status"),
  });

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-[480px] flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          {ticket && (
            <>
              <SheetTitle className="text-base font-semibold">{ticket.subject}</SheetTitle>
              <SheetDescription className="text-xs font-mono">{ticket.referenceNumber}</SheetDescription>
            </>
          )}
        </SheetHeader>

        {ticket && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted by</p>
              <p className="text-sm font-medium">{getUserDisplayName(ticket.user)}</p>
              <p className="text-xs text-muted-foreground">{ticket.user.email}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Category</p>
              <p className="text-sm">{CATEGORY_LABELS[ticket.category]}</p>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Description</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
            </div>

            {ticket.attachmentUrl && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attachment</p>
                <a
                  href={ticket.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                >
                  <Paperclip className="size-3.5" />
                  {ticket.attachmentName ?? "View attachment"}
                  <ExternalLink className="size-3" />
                </a>
              </div>
            )}

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</p>
              <Select value={ticket.status} onValueChange={(v) => updateStatus(v as TicketStatus)} disabled={isPending}>
                <SelectTrigger className="h-9 text-sm w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPEN">Open</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="RESOLVED">Resolved</SelectItem>
                  <SelectItem value="CLOSED">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Submitted</p>
              <p className="text-sm text-muted-foreground">
                {new Date(ticket.createdAt).toLocaleString("en-US", {
                  month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default function AdminSupportPage() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const PAGE_SIZE = 20;

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const ticketsQuery = useQuery({
    queryKey: ["admin-support-tickets", debouncedSearch, statusFilter, categoryFilter, page],
    queryFn: () =>
      api
        .get("/admin/support", {
          params: {
            page,
            pageSize: PAGE_SIZE,
            ...(debouncedSearch ? { search: debouncedSearch } : {}),
            ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
            ...(categoryFilter !== "ALL" ? { category: categoryFilter } : {}),
          },
        })
        .then((r) => r.data),
    staleTime: 30_000,
  });

  const tickets: SupportTicket[] = ticketsQuery.data?.data ?? [];
  const totalPages: number = ticketsQuery.data?.totalPages ?? 1;
  const totalRecords: number = ticketsQuery.data?.totalRecords ?? 0;
  const hasFilters = !!(debouncedSearch || statusFilter !== "ALL" || categoryFilter !== "ALL");

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="space-y-6 pb-10"
    >
      <TicketDetailSheet ticket={selected} open={!!selected} onClose={() => setSelected(null)} />

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Support</h1>
        <p className="text-sm text-muted-foreground mt-1">Review and respond to submitted support tickets.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            className="pl-8 h-9 text-sm"
            placeholder="Search reference, subject, description…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[150px]"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
            <SelectItem value="CLOSED">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 text-sm w-[170px]"><SelectValue placeholder="All Categories" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Categories</SelectItem>
            <SelectItem value="BILLING">Billing & credits</SelectItem>
            <SelectItem value="TECHNICAL">Technical / API</SelectItem>
            <SelectItem value="ACCOUNT">Account & security</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground" onClick={() => { setSearch(""); setStatusFilter("ALL"); setCategoryFilter("ALL"); setPage(1); }}>
            Clear filters
          </Button>
        )}

        {totalRecords > 0 && !ticketsQuery.isLoading && (
          <span className="text-xs text-muted-foreground ml-auto">{totalRecords} ticket{totalRecords !== 1 ? "s" : ""}</span>
        )}
      </div>

      <Card className="border-border/60 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
              <TableHead className="pl-5 py-3 font-semibold text-xs">Reference</TableHead>
              <TableHead className="py-3 font-semibold text-xs w-[30%]">Subject</TableHead>
              <TableHead className="py-3 font-semibold text-xs">Submitted by</TableHead>
              <TableHead className="py-3 font-semibold text-xs">Category</TableHead>
              <TableHead className="py-3 font-semibold text-xs">Status</TableHead>
              <TableHead className="py-3 font-semibold text-xs pr-5">Created</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ticketsQuery.isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/40">
                  <TableCell colSpan={6} className="py-3 pl-5">
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : tickets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="size-12 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-3">
                    <LifeBuoy className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {hasFilters ? "No tickets match your filters" : "No support tickets yet"}
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              tickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="group border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(ticket)}
                >
                  <TableCell className="pl-5 py-3.5 font-mono text-xs">{ticket.referenceNumber}</TableCell>
                  <TableCell className="py-3.5 text-sm font-medium truncate max-w-[280px]">{ticket.subject}</TableCell>
                  <TableCell className="py-3.5">
                    <p className="text-sm leading-tight">{getUserDisplayName(ticket.user)}</p>
                    <p className="text-xs text-muted-foreground">{ticket.user.email}</p>
                  </TableCell>
                  <TableCell className="py-3.5 text-xs text-muted-foreground">{CATEGORY_LABELS[ticket.category]}</TableCell>
                  <TableCell className="py-3.5"><StatusPill status={ticket.status} /></TableCell>
                  <TableCell className="py-3.5 pr-5 text-xs text-muted-foreground whitespace-nowrap">
                    {new Date(ticket.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
            <Button variant="outline" size="sm" className="h-8 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
