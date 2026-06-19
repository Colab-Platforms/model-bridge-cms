"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Info } from "lucide-react";

interface DataPoint {
  date: string;
  value: number;
}

import { Skeleton } from "@/components/ui/skeleton";

interface SpendOverviewChartProps {
  data: DataPoint[];
  totalSpend: string;
  trend: string;
  isLoading?: boolean;
}

export function SpendOverviewChart({ data, totalSpend, trend, isLoading }: SpendOverviewChartProps) {
  return (
    <Card className="col-span-1 border-none shadow-sm lg:col-span-2">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold text-slate-800">Spend Overview</CardTitle>
            <Info className="size-3.5 text-slate-400 cursor-help" />
          </div>
          <div className="flex items-baseline gap-2">
            {isLoading ? (
              <Skeleton className="h-9 w-32" />
            ) : (
              <>
                <span className="text-3xl font-bold text-slate-900">{totalSpend}</span>
                <span className="text-xs font-semibold text-emerald-500 bg-emerald-50 px-1.5 py-0.5 rounded">↑ {trend} from last week</span>
              </>
            )}
          </div>
          {isLoading ? <Skeleton className="h-3 w-24" /> : <p className="text-xs text-slate-400">Total spend this week</p>}
        </div>
        <Select defaultValue="daily">
          <SelectTrigger className="h-8 w-[100px] text-xs bg-slate-50 border-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="daily">Daily</SelectItem>
            <SelectItem value="weekly">Weekly</SelectItem>
            <SelectItem value="monthly">Monthly</SelectItem>
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="h-[300px] w-full">
          {isLoading ? (
            <Skeleton className="h-full w-full rounded-xl" />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: "#94a3b8" }} 
                />
                <Tooltip 
                  contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                  itemStyle={{ fontSize: "12px", fontWeight: "600" }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#6366f1"
                  strokeWidth={3}
                  fill="url(#spendGradient)"
                  dot={{ r: 4, fill: "#fff", stroke: "#6366f1", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
