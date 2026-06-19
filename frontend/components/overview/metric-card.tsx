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
        return "bg-indigo-50/50 border-indigo-100 shadow-indigo-100/20";
      case "success":
        return "bg-emerald-50/50 border-emerald-100 shadow-emerald-100/20";
      case "warning":
        return "bg-amber-50/50 border-amber-100 shadow-amber-100/20";
      default:
        return "bg-white border-slate-200 shadow-slate-200/20";
    }
  };

  const getIconStyles = () => {
    switch (variant) {
      case "primary":
        return "bg-indigo-500 text-white";
      case "success":
        return "bg-emerald-500 text-white";
      case "warning":
        return "bg-amber-500 text-white";
      default:
        return "bg-slate-100 text-slate-500";
    }
  };

  const getTrendStyles = () => {
    if (!trend) return "";
    return trend.isPositive ? "text-emerald-600" : "text-rose-600";
  };

  const getSparklineColor = () => {
    switch (variant) {
      case "primary":
        return "#6366f1";
      case "success":
        return "#10b981";
      case "warning":
        return "#f59e0b";
      default:
        return "#94a3b8";
    }
  };

  return (
    <Card className={cn("overflow-hidden border-none shadow-sm transition-all hover:shadow-md", getVariantStyles(), className)}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              {Icon && (
                <div className={cn("flex size-8 items-center justify-center rounded-lg", getIconStyles())}>
                  <Icon className="size-4" />
                </div>
              )}
              <span className="text-sm font-medium text-slate-500">{title}</span>
            </div>
            <div className="mt-2 space-y-1">
              {isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
              )}
              {isLoading ? (
                <Skeleton className="h-3 w-12" />
              ) : (
                subValue && <p className="text-xs font-medium text-slate-400">{subValue}</p>
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
            <span className="text-slate-400 font-normal">from last week</span>
          </div>
        )}
        {isLoading && <Skeleton className="mt-4 h-3 w-32" />}

        {!isLoading && footer && <div className="mt-4 pt-4 border-t border-slate-100/50">{footer}</div>}
        {isLoading && <div className="mt-4 pt-4 border-t border-slate-100/50"><Skeleton className="h-3 w-full" /></div>}
      </CardContent>
    </Card>
  );
}
