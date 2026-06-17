"use client";

import { useState, useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataPoint {
  date: string;
  [key: string]: string | number;
}

interface UsageStackedBarChartProps {
  title: string;
  description: string;
  data: DataPoint[];
  categories: { id: string; label: string; color: string }[];
  unit?: string;
  className?: string;
  showTrending?: boolean;
  /** When set, locks the chart to this metric and hides the spend/requests/tokens selector. */
  fixedMetric?: MetricType;
}

type MetricType = "spend" | "requests" | "tokens";

export function UsageStackedBarChart({
  title,
  description,
  data,
  categories,
  unit = "kcal",
  className,
  showTrending = true,
  fixedMetric,
}: UsageStackedBarChartProps) {
  const [metric, setMetric] = useState<MetricType>(fixedMetric ?? "spend");

  const chartConfig = useMemo(() => {
    const config: ChartConfig = {};
    categories.forEach((cat) => {
      config[cat.id] = {
        label: cat.label,
        color: cat.color,
      };
    });
    return config;
  }, [categories]);

  const unitLabel = useMemo(() => {
    if (metric === "spend") return "$";
    if (metric === "tokens") return "tk";
    return "req";
  }, [metric]);

  // Derived trending data
  const trendingData = useMemo(() => {
    if (!data.length) return [];
    const latest = data[data.length - 1];
    const previous = data.length > 1 ? data[data.length - 2] : null;

    return categories.map((cat) => {
      const currentVal = Number(latest[`${cat.id}_${metric}`]) || 0;
      const prevVal = previous ? Number(previous[`${cat.id}_${metric}`]) || 0 : 0;
      const pctChange = prevVal > 0 ? ((currentVal - prevVal) / prevVal) * 100 : 0;
      return { ...cat, value: currentVal, pctChange };
    }).sort((a, b) => b.value - a.value);
  }, [data, categories]);

  return (
    <Card className={cn("rounded-none border-border/40 bg-card/60 backdrop-blur-md shadow-sm flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="size-1 bg-primary" />
            <CardTitle className="text-sm font-bold uppercase tracking-[0.2em]">{title}</CardTitle>
          </div>
          <CardDescription className="text-xs">{description}</CardDescription>
        </div>
        {!fixedMetric && (
          <CardAction>
            <Select value={metric} onValueChange={(v) => setMetric(v as MetricType)}>
              <SelectTrigger className="w-[110px] rounded-none h-7 text-[10px] font-bold uppercase tracking-widest border-border/50 bg-background/50 transition-colors hover:bg-background">
                <SelectValue placeholder="Metric" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-border/50 bg-popover/95 backdrop-blur-md">
                <SelectItem value="spend" className="rounded-none text-[10px] font-bold uppercase">Spend</SelectItem>
                <SelectItem value="requests" className="rounded-none text-[10px] font-bold uppercase">Requests</SelectItem>
                <SelectItem value="tokens" className="rounded-none text-[10px] font-bold uppercase">Tokens</SelectItem>
              </SelectContent>
            </Select>
          </CardAction>
        )}
      </CardHeader>
      
      <div className="flex flex-1 flex-col lg:flex-row">
        <CardContent className="flex-1 pb-4">
          <ChartContainer config={chartConfig} className="h-[240px] w-full">
            <BarChart accessibilityLayer data={data} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="2 2" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis
                dataKey="date"
                tickLine={false}
                tickMargin={10}
                axisLine={false}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                }}
                style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tickFormatter={(value) => {
                   if (metric === "spend") return `$${value}`;
                   if (value >= 1000) return `${(value / 1000).toFixed(0)}k`;
                   return value;
                }}
                style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
              />
              
              {categories.map((cat) => (
                <Bar
                  key={cat.id}
                  dataKey={`${cat.id}_${metric}`}
                  stackId="a"
                  fill={cat.color}
                  radius={[0, 0, 0, 0]}
                  opacity={0.9}
                  className="transition-all hover:opacity-100"
                />
              ))}
              
              <ChartTooltip
                cursor={{ fill: "hsl(var(--primary) / 0.05)" }}
                content={
                  <ChartTooltipContent
                    hideLabel
                    className="w-[200px] rounded-none border-border/50 bg-popover/98 backdrop-blur-md p-3 shadow-2xl ring-1 ring-border/20"
                    formatter={(value, name, item, index) => {
                      const total = categories.reduce((sum, cat) => sum + (Number(item.payload[`${cat.id}_${metric}`]) || 0), 0);
                      const isLast = index === categories.length - 1;
                      // dataKey is now "${cat.id}_${metric}" — strip the suffix to look up chartConfig
                      const baseId = String(name).replace(/_(spend|requests|tokens)$/i, "");

                      return (
                        <>
                          <div className="flex w-full items-center gap-2 py-0.5">
                            <div
                              className="size-1.5 shrink-0"
                              style={{ backgroundColor: chartConfig[baseId] ? (chartConfig[baseId] as any).color : "transparent" }}
                            />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground/80">
                              {(chartConfig[baseId] ? (chartConfig[baseId] as any).label : baseId) || "Unknown"}
                            </span>
                            <div className="ml-auto flex items-baseline gap-1 font-mono font-bold text-foreground tabular-nums">
                              {metric === "spend" ? `$${Number(value).toFixed(4)}` : Number(value).toLocaleString()}
                            </div>
                          </div>
                          {isLast && (
                            <div className="mt-2 flex w-full items-center border-t border-border/40 pt-2 text-[10px] font-black uppercase tracking-widest text-primary">
                              Total
                              <div className="ml-auto flex items-baseline gap-1 font-mono text-xs font-black tabular-nums">
                                 {metric === "spend" ? `$${total.toFixed(4)}` : total.toLocaleString()}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    }}
                  />
                }
              />
            </BarChart>
          </ChartContainer>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {categories.slice(0, 4).map(cat => (
              <div key={cat.id} className="flex items-center gap-1.5">
                <div className="size-1.5" style={{ backgroundColor: cat.color }} />
                <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">{cat.label}</span>
              </div>
            ))}
            {categories.length > 4 && <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">+{categories.length - 4} more</span>}
          </div>
        </CardContent>

        {/* {showTrending && (
          <div className="w-full border-t border-border/40 bg-muted/20 p-4 lg:w-48 lg:border-l lg:border-t-0">
            <h4 className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/80">Trending</h4>
            <div className="space-y-4">
              {trendingData.slice(0, 3).map((item) => (
                <div key={item.id} className="group flex items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="truncate text-[10px] font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">{item.label}</span>
                    <span className="text-[9px] font-medium text-muted-foreground uppercase">{metric}</span>
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-[10px] font-bold text-foreground">
                      {metric === "spend" ? `$${item.value.toFixed(2)}` : Math.round(item.value).toLocaleString()}
                    </span>
                    <div className={cn(
                      "flex items-center gap-0.5 text-[9px] font-black uppercase",
                      item.pctChange >= 0 ? "text-emerald-500" : "text-rose-500"
                    )}>
                      {item.pctChange >= 0 ? "+" : ""}{item.pctChange.toFixed(1)}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-6 w-full border border-border/60 bg-background py-1.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground transition-all hover:bg-primary hover:text-primary-foreground hover:border-primary">
              View All
            </button>
          </div>
        )} */}
      </div>
    </Card>
  );
}
