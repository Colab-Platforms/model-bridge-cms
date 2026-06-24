"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { LayoutGrid, List, SearchX } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";
import type { ModelFilters, CapabilityType } from "@/types/index";
import { FilterSidebar } from "@/components/models/FilterSidebar";
import { ModelCard } from "@/components/models/ModelCard";
import { ComparisonTray } from "@/components/models/ComparisonTray";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  formatContextWindow,
  formatPrice,
  CAPABILITY_LABELS,
  CAPABILITY_COLORS,
} from "@/lib/modelUtils";

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: "newest", label: "Newest" },
  { value: "name_asc", label: "Name A→Z" },
  { value: "price_input_asc", label: "Input Price ↑" },
  { value: "price_input_desc", label: "Input Price ↓" },
  { value: "price_output_asc", label: "Output Price ↑" },
  { value: "price_output_desc", label: "Output Price ↓" },
  { value: "context_asc", label: "Context ↑" },
  { value: "context_desc", label: "Context ↓" },
];

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

function ModelsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── View mode ────────────────────────────────────────────────────────────
  const [view, setView] = useState<"grid" | "table">("grid");
  useEffect(() => {
    const saved = localStorage.getItem("mb_models_view");
    if (saved === "grid" || saved === "table") setView(saved);
  }, []);
  function handleViewChange(next: "grid" | "table") {
    setView(next);
    localStorage.setItem("mb_models_view", next);
  }

  // ── Pagination ───────────────────────────────────────────────────────────
  const PAGE_SIZE = 20;
  const currentPage = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(newPage));
    router.push(`/models?${params.toString()}`);
  }

  // ── Comparison selection ─────────────────────────────────────────────────
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  function handleSelectionChange(slug: string, checked: boolean) {
    if (checked && selectedSlugs.length < 4) {
      setSelectedSlugs((prev) => [...prev, slug]);
    } else if (!checked) {
      setSelectedSlugs((prev) => prev.filter((s) => s !== slug));
    }
  }
  function handleRemove(slug: string) {
    setSelectedSlugs((prev) => prev.filter((s) => s !== slug));
  }
  function handleClearSelection() {
    setSelectedSlugs([]);
  }

  // ── Build filters from URL ───────────────────────────────────────────────
  const providerIds = searchParams.getAll("providerId");
  const capabilities = searchParams.getAll("capability");
  const inputModalities = searchParams.getAll("inputModality");
  const outputModalities = searchParams.getAll("outputModality");

  const filters: ModelFilters = {
    q: searchParams.get("q") ?? undefined,
    providerId: providerIds.length > 0 ? providerIds : undefined,
    capability: capabilities.length > 0
      ? (capabilities as CapabilityType[])
      : undefined,
    inputModality: inputModalities.length > 0 ? inputModalities : undefined,
    outputModality: outputModalities.length > 0 ? outputModalities : undefined,
    minContext: searchParams.has("minContext")
      ? parseInt(searchParams.get("minContext")!, 10)
      : undefined,
    maxContext: searchParams.has("maxContext")
      ? parseInt(searchParams.get("maxContext")!, 10)
      : undefined,
    maxInputPrice: searchParams.has("maxInputPrice")
      ? parseFloat(searchParams.get("maxInputPrice")!)
      : undefined,
    maxOutputPrice: searchParams.has("maxOutputPrice")
      ? parseFloat(searchParams.get("maxOutputPrice")!)
      : undefined,
    sort: (searchParams.get("sort") as ModelFilters["sort"]) ?? undefined,
  };

  // Metadata query: all models without active filters, for sidebar provider list and price ranges.
  // Uses a high limit so all providers/prices are always visible regardless of what page you're on.
  // We use an aggressive staleTime (30 mins) to prevent this heavy call from firing on every visit.
  const { models: allModels, isLoading: isMetadataLoading } = useModels(
    { pageSize: 20 },
    { staleTime: 30 * 60 * 1000 } // 30 minutes
  );

  // Main query: respects all filters + current page
  const { models, total, isLoading, isError, refetch } = useModels({
    ...filters,
    page: currentPage,
    pageSize: PAGE_SIZE,
  });

  // ── Derived values ───────────────────────────────────────────────────────
  const uniqueProviders = useMemo(() => {
    if (!allModels) return [];
    const map = new Map<string, { id: string; displayName: string; count: number }>();
    for (const model of allModels) {
      if (!model?.provider?.id) continue;
      const entry = map.get(model.provider.id);
      if (entry) {
        entry.count++;
      } else {
        map.set(model.provider.id, {
          id: model.provider.id,
          displayName: model.provider.displayName || "Unknown",
          count: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [allModels]);

  const derivedMaxInputPrice = useMemo(() => {
    if (!allModels || allModels.length === 0) return 100;
    return Math.ceil(
      Math.max(...allModels.map((m) => parseFloat(m.inputPricePer1m)))
    );
  }, [allModels]);

  const derivedMaxOutputPrice = useMemo(() => {
    if (!allModels || allModels.length === 0) return 100;
    return Math.ceil(
      Math.max(...allModels.map((m) => parseFloat(m.outputPricePer1m)))
    );
  }, [allModels]);

  // ── Sort URL handler ─────────────────────────────────────────────────────
  const currentSort = searchParams.get("sort") ?? "newest";
  function handleSortChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    params.delete("page");
    const qs = params.toString();
    router.push(`/models${qs ? `?${qs}` : ""}`);
  }

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 p-6"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground/90 font-serif">Models</h1>
          <span className="text-sm text-muted-foreground">
            {total ?? 0} models
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Select value={currentSort} onValueChange={handleSortChange}>
            <SelectTrigger size="sm" className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex">
            <Button
              variant={view === "grid" ? "default" : "outline"}
              size="sm"
              className="rounded-r-none"
              aria-label="Grid view"
              onClick={() => handleViewChange("grid")}
            >
              <LayoutGrid className="size-4" />
            </Button>
            <Button
              variant={view === "table" ? "default" : "outline"}
              size="sm"
              className="rounded-l-none border-l-0"
              aria-label="Table view"
              onClick={() => handleViewChange("table")}
            >
              <List className="size-4" />
            </Button>
          </div>
        </div>
      </motion.div>

      {/* ── Two-column layout ──────────────────────────────────────────── */}
      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <FilterSidebar
            providers={uniqueProviders}
            maxInputPrice={derivedMaxInputPrice}
            maxOutputPrice={derivedMaxOutputPrice}
            isLoading={isMetadataLoading}
          />
        </div>

        {/* Main content */}
        <motion.div variants={itemVariants} className="flex-1">
          {/* Loading */}
          {isLoading && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-64 rounded-xl" />
              ))}
            </div>
          )}

          {/* Error */}
          {isError && !isLoading && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <p className="text-muted-foreground">Failed to load models</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          )}

          {/* Empty */}
          {!isLoading && !isError && models?.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 py-20">
              <SearchX className="size-10 text-muted-foreground" />
              <p className="text-muted-foreground">
                No models match your filters
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push("/models")}
              >
                Clear filters
              </Button>
            </div>
          )}

          {/* Grid view */}
          {!isLoading && !isError && models && models.length > 0 && view === "grid" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isSelected={selectedSlugs.includes(model.slug)}
                  onSelectionChange={handleSelectionChange}
                  selectionDisabled={selectedSlugs.length >= 4}
                />
              ))}
            </div>
          )}

          {/* Table view */}
          {!isLoading && !isError && models && models.length > 0 && view === "table" && (
            <div className="overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-500 hover:shadow-md mt-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Model</TableHead>
                    <TableHead>Capabilities</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead>Input Price</TableHead>
                    <TableHead>Output Price</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {models.map((model) => {
                    const visible = model.defaultForCapabilities.slice(0, 3);
                    const extra = model.defaultForCapabilities.length - 3;
                    return (
                      <TableRow key={model.id}>
                        <TableCell>
                          <p className="font-medium">{model.displayName}</p>
                          <p className="text-xs text-muted-foreground">
                            {model.provider.displayName}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {visible.map((cap) => (
                              <Badge
                                key={cap}
                                className={cn("text-xs shadow-sm", CAPABILITY_COLORS[cap])}
                              >
                                {CAPABILITY_LABELS[cap]}
                              </Badge>
                            ))}
                            {extra > 0 && (
                              <Badge
                                variant="secondary"
                                className="text-xs text-muted-foreground shadow-sm"
                              >
                                +{extra} more
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatContextWindow(model.contextLength)}
                        </TableCell>
                        <TableCell>
                          {formatPrice(model.inputPricePer1m)} / 1M
                        </TableCell>
                        <TableCell>
                          {formatPrice(model.outputPricePer1m)} / 1M
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="transition-all hover:-translate-y-0.5 hover:shadow-sm"
                              onClick={() => {
                                navigator.clipboard.writeText(model.slug);
                                toast.success("Slug copied", {
                                  description:
                                    "Paste it as the model param in your SDK call",
                                });
                              }}
                            >
                              Copy slug
                            </Button>
                            <Button size="sm" asChild className="transition-all hover:-translate-y-0.5 hover:shadow-sm">
                              <Link href={`/models/${model.slug}`}>
                                View details
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* ── Pagination ───────────────────────────────────────────── */}
          {!isLoading && !isError && total !== undefined && total > PAGE_SIZE && (
            <div className="flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                {Math.min((currentPage - 1) * PAGE_SIZE + 1, total)}–
                {Math.min(currentPage * PAGE_SIZE, total)} of {total} models
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {currentPage} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= Math.ceil(total / PAGE_SIZE)}
                  onClick={() => handlePageChange(currentPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* ── Comparison tray ────────────────────────────────────────────── */}
      <ComparisonTray
        selectedSlugs={selectedSlugs}
        models={models ?? []}
        onRemove={handleRemove}
        onClear={handleClearSelection}
      />
    </motion.div>
  );
}

export default function ModelsPage() {
  return (
    <Suspense>
      <ModelsContent />
    </Suspense>
  );
}
