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
    <Card className="transition-all hover:shadow-md border border-border/50 bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-border/40 hover:bg-transparent">
              <TableHead className="h-9 truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{headers[0]}</TableHead>
              <TableHead className="h-9 truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{headers[1]}</TableHead>
              <TableHead className="h-9 truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{headers[2]}</TableHead>
              <TableHead className="h-9 truncate text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{headers[3]}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-border/40">
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : (
              data.map((row) => (
                <TableRow key={row.id} className="border-border/30 hover:bg-muted/30">
                  <TableCell className="py-2.5">
                    <div className="flex items-center gap-2">
                      {row.icon}
                      <div className="flex flex-col truncate">
                        <span className="text-xs font-bold text-foreground truncate">{row.label}</span>
                        {row.subLabel && <span className="text-[10px] text-muted-foreground/80 truncate">{row.subLabel}</span>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="flex flex-col gap-1 w-24">
                      <span className="text-xs font-medium text-muted-foreground">{row.value1.toLocaleString()}</span>
                      {row.progress !== undefined && (
                        <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary/80 rounded-full transition-all" 
                            style={{ width: `${row.progress}%` }} 
                          />
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-xs font-medium text-muted-foreground/80">
                    {row.value2}
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-xs font-bold text-foreground">
                    {row.value3}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <a 
          href={footerHref}
          className="flex items-center justify-between border-t border-border/40 p-3 text-xs font-medium text-muted-foreground transition-all hover:bg-muted/30 hover:text-foreground"
        >
          {footerLabel}
          <ChevronRight className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}
