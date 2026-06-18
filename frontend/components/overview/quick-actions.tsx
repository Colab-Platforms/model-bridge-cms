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
    color: "bg-purple-50 text-purple-600",
    href: "/dashboard/keys",
  },
  {
    id: "credits",
    label: "Add Credits",
    description: "Top up your wallet",
    icon: Wallet,
    color: "bg-blue-50 text-blue-600",
    href: "/dashboard/credits",
  },
  {
    id: "logs",
    label: "View Logs",
    description: "Check request logs",
    icon: Activity,
    color: "bg-teal-50 text-teal-600",
    href: "/dashboard/usage",
  },
  {
    id: "models",
    label: "Browse Models",
    description: "Explore AI models",
    icon: Search,
    color: "bg-emerald-50 text-emerald-600",
    href: "/models",
  },
];

export function QuickActions() {
  return (
    <Card className="border-none shadow-sm h-full">
      <CardHeader>
        <CardTitle className="text-sm font-semibold text-slate-800">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3 pt-0">
        {ACTIONS.map((action) => (
          <a
            key={action.id}
            href={action.href}
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-100 p-4 text-center transition-all hover:bg-slate-50 hover:border-slate-200"
          >
            <div className={cn("flex size-10 items-center justify-center rounded-lg transition-transform group-hover:scale-110", action.color)}>
              <action.icon className="size-5" />
            </div>
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-slate-900">{action.label}</p>
              <p className="text-[10px] text-slate-500">{action.description}</p>
            </div>
          </a>
        ))}
        <a 
          href="/dashboard"
          className="col-span-2 mt-2 flex items-center justify-between text-xs font-medium text-slate-400 hover:text-slate-600 px-2"
        >
          View all actions
          <ChevronRight className="size-3.5" />
        </a>
      </CardContent>
    </Card>
  );
}
