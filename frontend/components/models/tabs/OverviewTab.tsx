"use client";

import { toast } from "sonner";
import { Copy } from "lucide-react";
import type { Model } from "@/types/index";
import {
  CAPABILITY_LABELS,
  CAPABILITY_COLORS,
  CAPABILITY_DESCRIPTIONS,
  MODALITY_LABELS,
  MODALITY_COLORS,
  formatContextWindow,
} from "@/lib/modelUtils";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface OverviewTabProps {
  model: Model;
}

export function OverviewTab({ model }: OverviewTabProps) {
  const addedDate = new Date(model.createdAt).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Section 1 — Capabilities */}
      <Card>
        <CardHeader>
          <CardTitle>Capabilities</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0 flex flex-col gap-4">
          {/* Capability badges + descriptions */}
          {model.defaultForCapabilities.length > 0 && (
            <div className="flex flex-col gap-0">
              {model.defaultForCapabilities.map((cap, i) => (
                <div key={cap}>
                  {i > 0 && <Separator className="my-3" />}
                  <div className="flex items-start gap-4">
                    <Badge className={cn("mt-0.5 shrink-0 text-xs font-medium", CAPABILITY_COLORS[cap])}>
                      {CAPABILITY_LABELS[cap]}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      {CAPABILITY_DESCRIPTIONS[cap]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Modality badges — same style as the models list page */}
          <div className="flex flex-col gap-2.5">
            {model.defaultForCapabilities.length === 0 && (
              <p className="text-sm text-muted-foreground">No specific capabilities listed for this model.</p>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-[36px]">In</span>
              {model.inputModalities.length > 0 ? model.inputModalities.map((m) => (
                <Badge key={m} className={cn("text-xs font-medium shadow-sm", MODALITY_COLORS[m] ?? "bg-muted text-muted-foreground")}>
                  {MODALITY_LABELS[m] ?? m}
                </Badge>
              )) : <span className="text-sm text-muted-foreground">—</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground min-w-[36px]">Out</span>
              {model.outputModalities.length > 0 ? model.outputModalities.map((m) => (
                <Badge key={m} className={cn("text-xs font-medium shadow-sm", MODALITY_COLORS[m] ?? "bg-muted text-muted-foreground")}>
                  {MODALITY_LABELS[m] ?? m}
                </Badge>
              )) : <span className="text-sm text-muted-foreground">—</span>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 2 — Model details */}
      <Card>
        <CardHeader>
          <CardTitle>Model details</CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5 pt-0">
          <dl className="grid grid-cols-[max-content_1fr] gap-x-8 gap-y-3 text-sm">
            <dt className="text-muted-foreground">Context window</dt>
            <dd>
              {formatContextWindow(model.contextLength)}{" "}
              <span className="text-muted-foreground">
                ({model.contextLength?.toLocaleString()} tokens)
              </span>
            </dd>

            <dt className="text-muted-foreground">Model slug</dt>
            <dd className="flex items-center gap-2">
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
                {model.slug}
              </code>
              <button
                type="button"
                aria-label="Copy slug"
                className="text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => {
                  navigator.clipboard.writeText(model.slug);
                  toast.success("Slug copied");
                }}
              >
                <Copy className="size-3.5" />
              </button>
            </dd>

            <dt className="text-muted-foreground">Input modalities</dt>
            <dd className="flex flex-wrap gap-1">
              {model.inputModalities.length > 0 ? model.inputModalities.map((m) => (
                <Badge key={m} className={cn("text-xs font-medium", MODALITY_COLORS[m] ?? "bg-muted text-muted-foreground")}>
                  {MODALITY_LABELS[m] ?? m}
                </Badge>
              )) : <span className="text-muted-foreground">—</span>}
            </dd>

            <dt className="text-muted-foreground">Output modalities</dt>
            <dd className="flex flex-wrap gap-1">
              {model.outputModalities.length > 0 ? model.outputModalities.map((m) => (
                <Badge key={m} className={cn("text-xs font-medium", MODALITY_COLORS[m] ?? "bg-muted text-muted-foreground")}>
                  {MODALITY_LABELS[m] ?? m}
                </Badge>
              )) : <span className="text-muted-foreground">—</span>}
            </dd>

            <dt className="text-muted-foreground">Added to platform</dt>
            <dd>{addedDate}</dd>

            {model.parameterCount && (
              <>
                <dt className="text-muted-foreground">Parameters</dt>
                <dd>{model.parameterCount} parameters</dd>
              </>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
