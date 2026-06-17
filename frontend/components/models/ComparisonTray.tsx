"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Model } from "@/types/index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ComparisonTrayProps {
  selectedSlugs: string[];
  models: Model[];
  onRemove: (slug: string) => void;
  onClear: () => void;
}

export function ComparisonTray({
  selectedSlugs,
  models,
  onRemove,
  onClear,
}: ComparisonTrayProps) {
  const router = useRouter();

  if (selectedSlugs.length === 0) return null;

  return (
    <div className="animate-in slide-in-from-bottom duration-200">
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          {/* Left: model chips + count */}
          <div className="flex flex-wrap items-center gap-2">
            {selectedSlugs.map((slug) => {
              const model = models.find((m) => m.slug === slug);
              return (
                <Badge
                  key={slug}
                  variant="secondary"
                  className="flex items-center gap-1.5 pr-1"
                >
                  <span className="max-w-[160px] truncate text-xs">
                    {model?.displayName ?? slug}
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${model?.displayName ?? slug}`}
                    onClick={() => onRemove(slug)}
                    className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              );
            })}
            <span className="text-xs text-muted-foreground">
              {selectedSlugs.length} of 4 selected
            </span>
          </div>

          {/* Right: actions */}
          <div className="flex shrink-0 items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear
            </Button>
            <Button
              size="sm"
              disabled={selectedSlugs.length < 2}
              onClick={() => {
                const ids = selectedSlugs.join(",");
                router.push(`/models/compare?ids=${ids}`);
              }}
            >
              Compare
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
