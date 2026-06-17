"use client";

import { TrendingUp } from "lucide-react";
import { CartesianGrid, Line, LineChart, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { motion } from "motion/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

interface TokenData {
  bucket: string;
  totalTokens: number;
  promptTokens: number;
  completionTokens: number;
}

interface LineGraphProps {
  data: TokenData[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export default function LineGraph({ data, title = "Token Consumption", subtitle, className }: LineGraphProps) {
  const chartConfig = {
    totalTokens: {
      label: "Total Tokens",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  // Format date for X-axis
  const fmtChartDate = (ts: string) => {
    return new Date(ts).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  };

  const lastValue = data.length > 0 ? data[data.length - 1].totalTokens : 0;
  const prevValue = data.length > 1 ? data[data.length - 2].totalTokens : 0;
  const trend = prevValue > 0 ? ((lastValue - prevValue) / prevValue * 100).toFixed(1) : "0";
  const isUp = lastValue >= prevValue;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className={className}
    >
      <Card className="rounded-[2.5rem] border-border/40 bg-card/60 backdrop-blur-md shadow-sm transition-all hover:shadow-lg overflow-hidden">
        <CardHeader className="pb-8">
          <CardTitle className="text-xl font-bold tracking-tight font-serif">{title}</CardTitle>
          {subtitle && <CardDescription className="text-sm text-muted-foreground">{subtitle}</CardDescription>}
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 15,
                left: -15,
                bottom: 0,
              }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis
                dataKey="bucket"
                tickLine={false}
                axisLine={false}
                tickMargin={12}
                tickFormatter={fmtChartDate}
                fontSize={10}
                tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                fontSize={10} 
                tick={{ fill: 'hsl(var(--muted-foreground))', fontWeight: 500 }}
                tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : v}
              />
              <ChartTooltip
                cursor={{ stroke: 'hsl(var(--primary))', strokeWidth: 1, strokeDasharray: '4 4' }}
                content={<ChartTooltipContent />}
              />
              <Line
                dataKey="totalTokens"
                type="monotone"
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={3}
                dot={false}
                activeDot={{ r: 6, fill: 'hsl(217, 91%, 60%)', strokeWidth: 0 }}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col items-start gap-1 p-8 pt-4">
          <div className="flex items-center gap-2 text-sm font-bold text-foreground">
            {isUp ? "Trending up" : "Trending down"} by {Math.abs(Number(trend))}% this period 
            <TrendingUp className={cn("h-4 w-4", isUp ? "text-emerald-500" : "text-amber-500 rotate-180")} />
          </div>
          <div className="text-xs text-muted-foreground font-medium">
            Computed from {data.length} data points
          </div>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
