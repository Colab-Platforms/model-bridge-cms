"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useModels } from "@/hooks/useModels";
import {
  formatContextWindow,
  formatPrice,
  CAPABILITY_LABELS,
} from "@/lib/modelUtils";
import type { Model, CapabilityType } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

function formatReleaseDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

const LABEL_CELL = "w-48 bg-background font-medium text-muted-foreground sticky left-0";

function CompareContent() {
  const searchParams = useSearchParams();

  const raw = searchParams.get("ids") ?? "";
  const slugs = raw ? raw.split(",").slice(0, 4) : [];

  const { models, isLoading } = useModels({});

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-8 w-48" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const selectedModels: Model[] = slugs
    .map((slug) => models?.find((m) => m.slug === slug))
    .filter((m): m is Model => m !== undefined);

  // ── Not enough models ────────────────────────────────────────────────────
  if (slugs.length < 2 || selectedModels.length < 2) {
    return (
      <div className="flex items-center justify-center p-6 pt-20">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-center text-sm text-muted-foreground">
              Select at least 2 models to compare
            </p>
            <Button asChild>
              <Link href="/models">← Back to models</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Derived comparison values ────────────────────────────────────────────
  const maxContext = Math.max(...selectedModels.map((m) => m.contextLength ?? 0));
  const minInputPrice = Math.min(
    ...selectedModels.map((m) => parseFloat(m.inputPricePer1m))
  );
  const minOutputPrice = Math.min(
    ...selectedModels.map((m) => parseFloat(m.outputPricePer1m))
  );
  const allCapabilities = Array.from(
    new Set(selectedModels.flatMap((m) => m.defaultForCapabilities))
  ) as CapabilityType[];

  const winClass = "font-semibold text-green-600 dark:text-green-400";

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">
          Comparing {selectedModels.length} models
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/models">← Back to models</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Comparison link copied");
            }}
          >
            Share comparison
          </Button>
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className={cn(LABEL_CELL, "text-foreground")}>
                Model
              </TableHead>
              {selectedModels.map((model) => (
                <TableHead key={model.id} className="min-w-44">
                  <p className="text-xs font-normal text-muted-foreground">
                    {model.provider.displayName}
                  </p>
                  <p className="font-semibold text-foreground">
                    {model.displayName}
                  </p>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {/* Row 1 — Provider */}
            <TableRow>
              <TableCell className={LABEL_CELL}>Provider</TableCell>
              {selectedModels.map((model) => (
                <TableCell key={model.id}>
                  {model.provider.displayName}
                </TableCell>
              ))}
            </TableRow>

            {/* Row 2 — Context Window */}
            <TableRow>
              <TableCell className={LABEL_CELL}>Context Window</TableCell>
              {selectedModels.map((model) => (
                <TableCell
                  key={model.id}
                  className={cn(
                    model.contextLength === maxContext && winClass
                  )}
                >
                  {formatContextWindow(model.contextLength)}
                </TableCell>
              ))}
            </TableRow>

            {/* Row 3 — Input Price */}
            <TableRow>
              <TableCell className={LABEL_CELL}>Input Price / 1M</TableCell>
              {selectedModels.map((model) => (
                <TableCell
                  key={model.id}
                  className={cn(
                    parseFloat(model.inputPricePer1m) === minInputPrice &&
                      winClass
                  )}
                >
                  {formatPrice(model.inputPricePer1m)}
                </TableCell>
              ))}
            </TableRow>

            {/* Row 4 — Output Price */}
            <TableRow>
              <TableCell className={LABEL_CELL}>Output Price / 1M</TableCell>
              {selectedModels.map((model) => (
                <TableCell
                  key={model.id}
                  className={cn(
                    parseFloat(model.outputPricePer1m) === minOutputPrice &&
                      winClass
                  )}
                >
                  {formatPrice(model.outputPricePer1m)}
                </TableCell>
              ))}
            </TableRow>

            {/* Rows 5+ — One per capability */}
            {allCapabilities.map((cap) => (
              <TableRow key={cap}>
                <TableCell className={LABEL_CELL}>
                  {CAPABILITY_LABELS[cap]}
                </TableCell>
                {selectedModels.map((model) => (
                  <TableCell key={model.id}>
                    {model.defaultForCapabilities.includes(cap) ? (
                      <span className="text-green-600 dark:text-green-400">
                        ✓
                      </span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}

            {/* Row — Released */}
            <TableRow>
              <TableCell className={LABEL_CELL}>Released</TableCell>
              {selectedModels.map((model) => (
                <TableCell key={model.id}>
                  {formatReleaseDate(model.releaseDate)}
                </TableCell>
              ))}
            </TableRow>

            {/* Row — Status */}
            <TableRow>
              <TableCell className={LABEL_CELL}>Status</TableCell>
              {selectedModels.map((model) => (
                <TableCell key={model.id}>
                  <Badge
                    className={
                      model.isActive
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    }
                  >
                    {model.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
              ))}
            </TableRow>

            {/* Footer row — actions */}
            <TableRow>
              <TableCell className={LABEL_CELL} />
              {selectedModels.map((model) => (
                <TableCell key={model.id}>
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/models/${model.slug}`}>View details</Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(model.slug);
                        toast.success("Slug copied");
                      }}
                    >
                      Copy slug
                    </Button>
                  </div>
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <CompareContent />
    </Suspense>
  );
}
