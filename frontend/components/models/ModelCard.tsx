"use client";

import Link from "next/link";
import { toast } from "sonner";
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
    <Card className="group relative">
      {/* Comparison checkbox — fades in on hover, always visible when selected */}
      <div className="absolute right-3 top-3 z-10">
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

      <CardHeader>
        {/* Row 1: provider name + status badges */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {model.provider.displayName}
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            {isNewModel(model.releaseDate) && (
              <Badge className="bg-green-100 text-green-700 text-xs">
                New
              </Badge>
            )}
            {!model.isActive && (
              <Badge className="bg-red-100 text-red-700 text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        {/* Row 2: model display name */}
        <CardTitle>{model.displayName}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Capability badges */}
        <div className="flex flex-wrap gap-1.5">
          {visibleCapabilities.map((cap) => (
            <Badge key={cap} className={cn("text-xs", CAPABILITY_COLORS[cap])}>
              {CAPABILITY_LABELS[cap]}
            </Badge>
          ))}
          {extraCount > 0 && (
            <Badge variant="secondary" className="text-xs text-muted-foreground">
              +{extraCount} more
            </Badge>
          )}
        </div>

        {/* Modalities */}
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">In:</span>{" "}
          {model.inputModalities.map((m) => MODALITY_LABELS[m] ?? m).join(", ")}
          {"  ·  "}
          <span className="font-medium text-foreground">Out:</span>{" "}
          {model.outputModalities.map((m) => MODALITY_LABELS[m] ?? m).join(", ")}
        </p>

        {/* Stats row */}
        <div className="flex items-start divide-x divide-border text-xs">
          <div className="flex-1 pr-3">
            <p className="text-muted-foreground">Context</p>
            <p className="font-medium">
              {formatContextWindow(model.contextLength)}
            </p>
          </div>
          <div className="flex-1 px-3">
            <p className="text-muted-foreground">Input</p>
            <p className="font-medium">
              {formatPrice(model.inputPricePer1m)} in
            </p>
          </div>
          <div className="flex-1 pl-3">
            <p className="text-muted-foreground">Output</p>
            <p className="font-medium">
              {formatPrice(model.outputPricePer1m)} out
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
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
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/models/${model.slug}`}>View details</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
