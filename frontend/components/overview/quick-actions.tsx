"use client";

import * as React from "react";
import { Key, Wallet, Activity, Search, ChevronRight, type LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ActionItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  href: string;
}

const ACTIONS: ActionItem[] = [
  {
    id: "api-key",
    label: "Create API Key",
    description: "Generate new key",
    icon: Key,
    color: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    href: "/dashboard/keys",
  },
  {
    id: "credits",
    label: "Add Credits",
    description: "Top up your wallet",
    icon: Wallet,
    color: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    href: "/dashboard/credits",
  },
  {
    id: "logs",
    label: "View Logs",
    description: "Check request logs",
    icon: Activity,
    color: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    href: "/dashboard/usage",
  },
  {
    id: "models",
    label: "Browse Models",
    description: "Explore AI models",
    icon: Search,
    color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    href: "/models",
  },
];

export function QuickActions() {
  return (
    <Card className="transition-all hover:shadow-md border border-border/50 bg-card h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-foreground">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-0">
        {ACTIONS.map((action) => (
          <a
            key={action.id}
            href={action.href}
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-border/60 p-4 text-center transition-all hover:bg-muted/30 hover:border-border"
          >
            <div className={cn("flex size-10 items-center justify-center rounded-lg transition-transform duration-200 group-hover:scale-110", action.color)}>
              <action.icon className="size-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-foreground">{action.label}</p>
              <p className="text-[10px] text-muted-foreground">{action.description}</p>
            </div>
          </a>
        ))}
        <a 
          href="/dashboard"
          className="col-span-2 mt-2 flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground px-2"
        >
          View all actions
          <ChevronRight className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}
