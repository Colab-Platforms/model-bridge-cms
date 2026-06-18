"use client";

import * as React from "react";
import { CheckCircle2, Globe, Clock, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StatusGridProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function StatusRow({ onRefresh, isRefreshing }: StatusGridProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 py-1">
     

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700 shadow-xs">
          <span>May 18 — May 25, 2025</span>
          <div className="size-1 rounded-full bg-slate-300" />
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={onRefresh}
          className="h-7 gap-1.5 rounded-lg border-slate-200 bg-white text-[11px] font-bold text-slate-700 shadow-xs"
        >
          <RefreshCw className={cn("size-3", isRefreshing && "animate-spin")} />
          Refresh
        </Button>
      </div>
    </div>
  );
}
