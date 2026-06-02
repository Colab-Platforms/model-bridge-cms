"use client";

import type { LucideIcon } from "lucide-react";
import { Activity, Key, BarChart3, DollarSign } from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuthStore } from "@/store/authStore";

interface StatCard {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
}

const STAT_CARDS: StatCard[] = [
  {
    label: "Total Requests",
    value: "—",
    description: "All-time API calls",
    icon: Activity,
  },
  {
    label: "Total Tokens",
    value: "—",
    description: "Prompt + completion tokens",
    icon: BarChart3,
  },
  {
    label: "Total Spend",
    value: "$0.00",
    description: "Lifetime cost",
    icon: DollarSign,
  },
  {
    label: "Active Keys",
    value: "0",
    description: "Currently active API keys",
    icon: Key,
  },
];

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome back, {user?.firstName}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s a summary of your account activity.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {STAT_CARDS.map(({ label, value, description, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {label}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
