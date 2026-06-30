"use client";

import * as React from "react";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export type DatePreset = "7d" | "30d" | "90d" | "custom";

interface StatusRowProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  preset: DatePreset;
  onPresetChange: (p: DatePreset) => void;
  customStart: string;
  customEnd: string;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
}

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: "7d",     label: "7D"     },
  { key: "30d",    label: "30D"    },
  { key: "90d",    label: "90D"    },
  { key: "custom", label: "Custom" },
];

export function StatusRow({
  onRefresh,
  isRefreshing,
  preset,
  onPresetChange,
  customStart,
  customEnd,
  onCustomStartChange,
  onCustomEndChange,
}: StatusRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      {/* Preset pills */}
      <div className="flex rounded-xl border border-border/60 overflow-hidden bg-muted/40 p-0.5 gap-0.5">
        {PRESETS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onPresetChange(key)}
            className={cn(
              "px-3 py-1.5 text-[12.5px] font-semibold rounded-[9px] transition-all",
              preset === key
                ? "bg-card text-primary shadow-xs border border-border/60"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Custom date inputs — only visible when Custom is selected */}
      {preset === "custom" && (
        <>
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/60">From</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => onCustomStartChange(e.target.value)}
              className="h-9 rounded-xl border border-border/60 bg-card px-3 text-[13px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.09em] text-muted-foreground/60">To</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => onCustomEndChange(e.target.value)}
              className="h-9 rounded-xl border border-border/60 bg-card px-3 text-[13px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition-all"
            />
          </div>
        </>
      )}

      {/* Refresh */}
      <button
        onClick={onRefresh}
        aria-label="Refresh"
        className={cn(
          "h-9 w-9 rounded-xl border border-border/60 bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border hover:shadow-xs transition-all",
          isRefreshing && "text-primary"
        )}
      >
        <RefreshCw className={cn("size-3.5", isRefreshing && "animate-spin")} />
      </button>
    </div>
  );
}
