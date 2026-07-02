"use client";

import Link from "next/link";
import { toast } from "sonner";
import { BrainCircuit } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Model } from "@/types/index";
import {
  formatContextWindow,
  formatPrice,
  isNewModel,
  CAPABILITY_LABELS,
  CAPABILITY_COLORS,
  MODALITY_LABELS,
} from "@/lib/modelUtils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface ModelCardProps {
  model: Model;
  isSelected: boolean;
  onSelectionChange: (slug: string, checked: boolean) => void;
  selectionDisabled: boolean;
}

export function ModelCard({
  model,
  isSelected,
  onSelectionChange,
  selectionDisabled,
}: ModelCardProps) {
  const visibleCapabilities = model.defaultForCapabilities.slice(0, 3);
  const extraCount = model.defaultForCapabilities.length - 3;

  return (
    <Card className="group relative overflow-hidden rounded-3xl border border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all duration-500 hover:shadow-xl hover:-translate-y-1">
      {/* Top accent gradient stripe */}
      <div className="h-[3px] bg-gradient-to-r from-primary/70 via-primary/35 to-transparent" />

      {/* Comparison checkbox — fades in on hover, always visible when selected */}
      <div className="absolute right-3 top-5 z-10">
        <Checkbox
          checked={isSelected}
          disabled={selectionDisabled && !isSelected}
          onCheckedChange={(checked) =>
            onSelectionChange(model.slug, checked as boolean)
          }
          className={cn(
            "opacity-0 transition-opacity group-hover:opacity-100",
            isSelected && "opacity-100"
          )}
        />
      </div>

      <CardHeader className="pb-3">
        {/* Row 1: provider logo + name + status badges */}
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-muted/60 border border-border/40 shrink-0 overflow-hidden flex items-center justify-center shadow-sm">
            {model.provider.providerLogo
              ? <img src={model.provider.providerLogo} alt={model.provider.displayName} className="size-full object-contain p-1" />
              : <BrainCircuit className="size-4 text-muted-foreground" />
            }
          </div>
          <span className="text-xs text-muted-foreground font-medium">
            {model.provider.displayName}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {isNewModel(model.releaseDate) && (
              <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] border border-green-200 dark:border-green-800/40 px-1.5 animate-pulse">
                New
              </Badge>
            )}
            {!model.isActive && (
              <Badge className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] border border-red-200 dark:border-red-800/40 px-1.5">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        {/* Row 2: model display name */}
        <CardTitle className="text-base leading-snug mt-1">{model.displayName}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3.5 pt-0">
        {/* Capability badges */}
        <div className="flex flex-wrap gap-1.5">
          {visibleCapabilities.map((cap) => (
            <Badge key={cap} className={cn("text-[10px] px-1.5 shadow-sm", CAPABILITY_COLORS[cap])}>
              {CAPABILITY_LABELS[cap]}
            </Badge>
          ))}
          {extraCount > 0 && (
            <Badge variant="secondary" className="text-[10px] px-1.5 text-muted-foreground shadow-sm">
              +{extraCount}
            </Badge>
          )}
        </div>

        {/* Modalities */}
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground/80">In:</span>{" "}
          {model.inputModalities.map((m) => MODALITY_LABELS[m] ?? m).join(", ")}
          <span className="mx-1.5 text-muted-foreground/40">·</span>
          <span className="font-medium text-foreground/80">Out:</span>{" "}
          {model.outputModalities.map((m) => MODALITY_LABELS[m] ?? m).join(", ")}
        </p>

        {/* Stats row */}
        <div className="flex items-start divide-x divide-border/60 text-xs bg-muted/20 rounded-xl p-2.5 border border-border/30">
          <div className="flex-1 pr-3">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">Context</p>
            <p className="font-semibold mt-0.5">{formatContextWindow(model.contextLength)}</p>
          </div>
          <div className="flex-1 px-3">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">Input</p>
            <p className="font-semibold mt-0.5">{formatPrice(model.inputPricePer1m)}</p>
          </div>
          <div className="flex-1 pl-3">
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide font-medium">Output</p>
            <p className="font-semibold mt-0.5">{formatPrice(model.outputPricePer1m)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 transition-all hover:-translate-y-0.5 hover:shadow-sm"
            onClick={() => {
              navigator.clipboard.writeText(model.slug);
              toast.success("Slug copied", {
                description: "Paste it as the model param in your SDK call",
              });
            }}
          >
            Copy slug
          </Button>
          <Button size="sm" className="flex-1 transition-all hover:-translate-y-0.5 hover:shadow-sm" asChild>
            <Link href={`/models/${model.slug}`}>View details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
