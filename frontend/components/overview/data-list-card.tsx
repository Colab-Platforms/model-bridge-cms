"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface DataRow {
  id: string;
  label: string;
  subLabel?: string;
  icon?: React.ReactNode;
  value1: string | number; // Requests
  value2: string | number; // Tokens/Usage
  value3: string; // Cost
  progress?: number; // 0-100
}

import { Skeleton } from "@/components/ui/skeleton";

interface DataListCardProps {
  title: string;
  headers: [string, string, string, string];
  data: DataRow[];
  footerHref: string;
  footerLabel: string;
  isLoading?: boolean;
}

export function DataListCard({ title, headers, data, footerHref, footerLabel, isLoading }: DataListCardProps) {
  return (
    <Card className="border-none shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-slate-800">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-50 hover:bg-transparent">
              <TableHead className="h-9 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{headers[0]}</TableHead>
              <TableHead className="h-9 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{headers[1]}</TableHead>
              <TableHead className="h-9 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">{headers[2]}</TableHead>
              <TableHead className="h-9 truncate text-right text-[10px] font-bold uppercase tracking-wider text-slate-400">{headers[3]}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-slate-50">
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="border-slate-50 hover:bg-slate-50/50">
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      {row.icon}
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-slate-800 truncate">{row.label}</span>
                        {row.subLabel && <span className="text-[10px] text-slate-400 truncate">{row.subLabel}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col gap-1 w-24">
                      <span className="text-xs font-medium text-slate-700">{row.value1.toLocaleString()}</span>
                      {row.progress !== undefined && (
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-indigo-400/60 rounded-full transition-all" 
                            style={{ width: `${row.progress}%` }} 
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs font-medium text-slate-500">
                    {row.value2}
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-xs font-bold text-slate-900">
                    {row.value3}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <a 
          href={footerHref}
          className="flex items-center justify-between border-t border-slate-50 p-3 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-50 hover:text-slate-600"
        >
          {footerLabel}
          <ChevronRight className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}
