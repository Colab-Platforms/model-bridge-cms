"use client";

import * as React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

interface DataItem {
  name: string;
  value: number;
  color: string;
  count?: string;
  percentage?: string;
}

import { Skeleton } from "@/components/ui/skeleton";

interface DonutChartCardProps {
  title: string;
  totalValue?: string;
  totalLabel: string;
  data: DataItem[];
  trend?: string;
  isLoading?: boolean;
}

export function DonutChartCard({ title, totalValue, totalLabel, data, trend, isLoading }: DonutChartCardProps) {
  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
          <Info className="size-3.5 text-slate-400 cursor-help" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4">
          <div className="relative h-[160px] w-[160px] shrink-0">
            {isLoading ? (
              <Skeleton className="h-full w-full rounded-full" />
            ) : (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={75}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-bold text-slate-900">{totalValue}</span>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">{totalLabel}</span>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-1 flex-col gap-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-2 w-12" />
                </div>
              ))
            ) : (
              data.map((item, index) => (
                <div key={index} className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-xs font-medium text-slate-500 whitespace-nowrap">{item.name}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-900">{item.count || item.value}</span>
                  </div>
                  {item.percentage && (
                    <div className="ml-4 text-[10px] text-slate-400 font-medium">{item.percentage}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        
        {!isLoading && trend && (
          <div className="mt-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-500">
            <span>↑ {trend} from last week</span>
          </div>
        )}
        {isLoading && <Skeleton className="mt-4 h-2 w-24" />}
      </CardContent>
    </Card>
  );
}
