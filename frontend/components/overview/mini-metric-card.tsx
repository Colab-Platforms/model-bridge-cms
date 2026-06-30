"use client";

import * as React from "react";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

import { Skeleton } from "@/components/ui/skeleton";

interface MiniMetricCardProps {
  label: string;
  value?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  isLoading?: boolean;
}

export function MiniMetricCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  isLoading,
}: MiniMetricCardProps) {
  return (
    <div className={cn("flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:border-border/80", className)}>
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div className="space-y-0.5 flex-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Skeleton className="h-5 w-12" />
          ) : (
            <p className="text-lg font-bold text-foreground">{value}</p>
          )}
          {!isLoading && trend && (
            <span className={cn("text-[10px] font-bold", trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
