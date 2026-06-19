"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import { cn } from "@/lib/utils";

interface Model {
  id: string;
  slug: string;
  displayName: string | null;
  description: string | null;
  contextLength: number | null;
  maxOutputTokens: number | null;
  inputPricePerToken: string | null;
  outputPricePerToken: string | null;
  isActive: boolean;
  provider: {
    id: string;
    slug: string | null;
    displayName: string | null;
    isActive: boolean;
  };
}

function fmtPrice(v: string | null) {
  if (!v) return "—";
  const n = parseFloat(v);
  if (isNaN(n)) return "—";
  return `$${n.toFixed(8)}`;
}

function fmtCtx(n: number | null) {
  if (!n) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function AdminModelsPage() {
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");

  const { data: models = [], isLoading } = useQuery<Model[]>({
    queryKey: ["admin-models"],
    queryFn: () => api.get("/models").then((r) => {
      const raw = r.data;
      if (Array.isArray(raw)) return raw;
      if (raw?.data && Array.isArray(raw.data)) return raw.data;
      return [];
    }),
    staleTime: 2 * 60_000,
  });

  const providers = Array.from(new Set(models.map((m) => m.provider?.displayName ?? m.provider?.slug).filter(Boolean)));

  const filtered = models.filter((m) => {
    const name = (m.displayName ?? m.slug ?? "").toLowerCase();
    if (search && !name.includes(search.toLowerCase())) return false;
    if (providerFilter && (m.provider?.displayName ?? m.provider?.slug) !== providerFilter) return false;
    if (activeFilter === "active" && !m.isActive) return false;
    if (activeFilter === "inactive" && m.isActive) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Models</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isLoading ? "Loading…" : `${models.length} models across ${providers.length} providers`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Search models…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 rounded-none h-8 text-sm"
          />
        </div>

        <select
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="h-8 rounded-none border border-border bg-background px-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/30 cursor-pointer"
        >
          <option value="">All providers</option>
          {providers.map((p) => (
            <option key={p} value={p!}>{p}</option>
          ))}
        </select>

        <div className="flex overflow-hidden rounded-none border border-border">
          {(["all", "active", "inactive"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setActiveFilter(v)}
              className={cn(
                "px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                activeFilter === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Models table */}
      <Card className="rounded-none">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs uppercase tracking-wider">Model</TableHead>
                <TableHead className="text-xs uppercase tracking-wider">Provider</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Context</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Input / token</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-right">Output / token</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={6}>
                        <Skeleton className="h-5 w-full rounded-none" />
                      </TableCell>
                    </TableRow>
                  ))
                : filtered.length === 0
                ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-16 text-center text-sm text-muted-foreground">
                        <BrainCircuit className="size-10 mx-auto mb-3 text-muted-foreground/40" />
                        No models found.
                      </TableCell>
                    </TableRow>
                  )
                : filtered.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{m.displayName ?? m.slug}</p>
                        <p className="text-xs text-muted-foreground font-mono">{m.slug}</p>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{m.provider?.displayName ?? m.provider?.slug ?? "—"}</span>
                          {!m.provider?.isActive && (
                            <Badge variant="secondary" className="text-xs rounded-none px-1 py-0">inactive</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
                        {fmtCtx(m.contextLength)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground font-mono">
                        {fmtPrice(m.inputPricePerToken)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground font-mono">
                        {fmtPrice(m.outputPricePerToken)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={cn(
                            "rounded-none text-xs px-2 py-0",
                            m.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-100"
                              : "bg-red-100 text-red-600 hover:bg-red-100"
                          )}
                        >
                          {m.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
