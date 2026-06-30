"use client";

import * as React from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SparklineData {
  value: number;
}

import { Skeleton } from "@/components/ui/skeleton";

interface MetricCardProps {
  title: string;
  value?: string;
  subValue?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  sparklineData?: SparklineData[];
  footer?: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning";
  className?: string;
  isLoading?: boolean;
}

export function MetricCard({
  title,
  value,
  subValue,
  icon: Icon,
  trend,
  sparklineData,
  footer,
  variant = "default",
  className,
  isLoading,
}: MetricCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-gradient-to-br from-primary/[0.04] to-transparent border border-primary/20 shadow-xs hover:border-primary/40";
      case "success":
        return "bg-gradient-to-br from-emerald-500/[0.04] to-transparent border border-emerald-500/20 shadow-xs hover:border-emerald-500/40";
      case "warning":
        return "bg-gradient-to-br from-amber-500/[0.04] to-transparent border border-amber-500/20 shadow-xs hover:border-amber-500/40";
      default:
        return "bg-card border border-border/50 hover:border-border/80 shadow-xs";
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-primary/10 text-primary";
      case "success":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
      case "warning":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getTrendStyles = () => {
    if (!trend) return "";
    return trend.isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
  };

  const getSparklineColor = () => {
    switch (variant) {
      case "primary":
        return "var(--primary)";
      case "success":
        return "#10b981";
      case "warning":
        return "#f59e0b";
      default:
        return "#94a3b8";
    }
  };

  return (
    <Card className={cn("overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md", getVariantStyles(), className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className={cn("flex size-8 items-center justify-center rounded-lg", getIconStyles())}>
                  <Icon className="size-4" />
                </div>
              )}
              <span className="text-sm font-medium text-muted-foreground">{title}</span>
            </div>
            <div className="mt-2 space-y-1">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
              )}
              {isLoading ? (
                <Skeleton className="h-3 w-12" />
              ) : (
                subValue && <p className="text-xs font-medium text-muted-foreground/80">{subValue}</p>
              )}
            </div>
          </div>

          {!isLoading && sparklineData && (
            <div className="h-12 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={getSparklineColor()} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={getSparklineColor()} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke={getSparklineColor()}
                    strokeWidth={2}
                    fill={`url(#gradient-${title})`}
                    isAnimationActive={true}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
          {isLoading && <Skeleton className="h-12 w-24 rounded-lg" />}
        </div>

        {!isLoading && trend && (
          <div className={cn("mt-4 flex items-center gap-1.5 text-xs font-semibold", getTrendStyles())}>
            <span className="flex items-center">
              {trend.isPositive ? "↑" : "↓"} {trend.value}
            </span>
            <span className="text-muted-foreground/60 font-normal">from last week</span>
          </div>
        )}
        {isLoading && <Skeleton className="mt-4 h-3 w-32" />}

        {!isLoading && footer && <div className="mt-4 pt-4 border-t border-border/50">{footer}</div>}
        {isLoading && <div className="mt-4 pt-4 border-t border-border/50"><Skeleton className="h-3 w-full" /></div>}
      </CardContent>
    </Card>
  );
}
