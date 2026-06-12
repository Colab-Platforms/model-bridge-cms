"use client";

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import { Activity, Key, BarChart3, DollarSign, TrendingUp, Sparkles, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { useProjectStore } from "@/store/projectStore";
import api from "@/lib/api";
import { DailySpendChart } from "@/components/charts/DailySpendChart";

interface StatsSummary {
  totalRequests: number;
  successfulRequests: number;
  totalTokens: number;
  totalSpendUsd: number;
  avgLatencyMs: number;
}

interface StatsResponse {
  summary: StatsSummary;
  dailySpend: { date: string; costUsd: number }[];
}

interface StatCard {
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
  gradient: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

export default function OverviewPage() {
  const user = useAuthStore((s) => s.user);
  const activeProject = useProjectStore((s) => s.activeProject);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startDate = thirtyDaysAgo.toISOString().split("T")[0];
  const endDate = new Date().toISOString().split("T")[0];

  const { data: stats, isLoading } = useQuery<StatsResponse>({
    queryKey: ["stats", { startDate, endDate, projectId: activeProject?.id }],
    queryFn: () =>
      api
        .get("/usage/stats", {
          params: { startDate, endDate, groupBy: "day", projectId: activeProject!.id },
        })
        .then((r) => r.data),
    enabled: !!activeProject,
  });

  const STAT_CARDS = useMemo<StatCard[]>(
    () => [
      {
        label: "Total Requests",
        value: stats?.summary.totalRequests.toLocaleString() ?? "—",
        description: "Last 30 days",
        icon: Activity,
        gradient: "from-blue-500/20 to-cyan-500/20 text-blue-500",
      },
      {
        label: "Total Tokens",
        value: stats?.summary.totalTokens.toLocaleString() ?? "—",
        description: "Prompt + completion tokens",
        icon: Sparkles,
        gradient: "from-indigo-500/20 to-purple-500/20 text-indigo-500",
      },
      {
        label: "Total Spend",
        value:
          stats?.summary.totalSpendUsd != null
            ? `$${stats.summary.totalSpendUsd.toFixed(2)}`
            : "$0.00",
        description: "Last 30 days",
        icon: DollarSign,
        gradient: "from-emerald-500/20 to-teal-500/20 text-emerald-500",
      },
      {
        label: "Active Keys",
        value: "0",
        description: "Currently active API keys",
        icon: Key,
        gradient: "from-amber-500/20 to-orange-500/20 text-amber-500",
      },
    ],
    [stats]
  );

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-8 pb-10"
    >
      {/* Welcome header */}
      <motion.div variants={itemVariants} className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground/90" style={{ fontFamily: "var(--font-serif, serif)" }}>
          Welcome back, {user?.firstName}
        </h2>
        <p className="text-muted-foreground max-w-xl text-sm md:text-base">
          Here&apos;s a quick overview of your account activity. Dive deeper into your metrics or manage your projects from here.
        </p>
      </motion.div>

      {/* Stat cards */}
      <motion.div variants={itemVariants} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STAT_CARDS.map(({ label, value, description, icon: Icon, gradient }) => (
          <Card 
            key={label} 
            className="group relative overflow-hidden transition-all duration-500 hover:shadow-xl hover:-translate-y-1 bg-card/60 backdrop-blur-md border-border/40"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none`} />
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0 relative z-10">
              <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                {label}
              </CardTitle>
              <div className={`p-2.5 rounded-[14px] bg-gradient-to-br ${gradient} bg-opacity-20 shadow-sm`}>
                <Icon className="size-4" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10 pt-2">
              {isLoading ? (
                <Skeleton className="h-9 w-24 rounded-lg" />
              ) : (
                <p className="text-[2rem] font-bold tracking-tight text-foreground">{value}</p>
              )}
              <p className="mt-2 text-xs text-muted-foreground font-medium">{description}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Charts & Actions Section */}
      <motion.div variants={itemVariants} className="grid gap-6 md:grid-cols-7 lg:grid-cols-3">
        {/* Spend Chart */}
        <Card className="md:col-span-4 lg:col-span-2 bg-card/60 backdrop-blur-md shadow-sm hover:shadow-md transition-all duration-500 border-border/40 overflow-hidden flex flex-col">
          <CardHeader className="border-b border-white/5 pb-4">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <span className="p-1.5 bg-primary/10 rounded-lg text-primary">
                <TrendingUp className="size-4" />
              </span>
              Spend Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 flex-1 min-h-[260px]">
             {isLoading ? (
                <Skeleton className="h-full w-full rounded-xl" />
              ) : (
                <DailySpendChart data={stats?.dailySpend ?? []} />
              )}
          </CardContent>
        </Card>

        {/* Quick Actions Panel */}
        <Card className="md:col-span-3 lg:col-span-1 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20 relative overflow-hidden group flex flex-col">
          {/* Decorative blur blob */}
          <div className="absolute top-0 right-0 p-16 bg-primary/20 blur-[50px] rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-[2]" />
          
          <CardHeader className="relative z-10 pb-4">
            <CardTitle className="text-lg font-semibold" style={{ fontFamily: "var(--font-serif, serif)" }}>
              Quick Actions
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Common tasks and settings
            </p>
          </CardHeader>
          
          <CardContent className="flex flex-col gap-3 relative z-10 flex-1">
            <Link href="/dashboard/keys" className="group/btn flex items-center justify-between w-full p-4 text-sm font-medium transition-all duration-300 bg-background/60 backdrop-blur-sm rounded-xl border border-border/40 hover:bg-background hover:shadow-md text-foreground">
              <div className="flex items-center gap-3">
                <Key className="size-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                <span>Manage API Keys</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50 group-hover/btn:translate-x-1 group-hover/btn:text-primary transition-all" />
            </Link>
            
            <Link href="/dashboard/stats" className="group/btn flex items-center justify-between w-full p-4 text-sm font-medium transition-all duration-300 bg-background/60 backdrop-blur-sm rounded-xl border border-border/40 hover:bg-background hover:shadow-md text-foreground">
              <div className="flex items-center gap-3">
                <BarChart3 className="size-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                <span>View Detailed Stats</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50 group-hover/btn:translate-x-1 group-hover/btn:text-primary transition-all" />
            </Link>

            <Link href="/dashboard/settings" className="group/btn flex items-center justify-between w-full p-4 text-sm font-medium transition-all duration-300 bg-background/60 backdrop-blur-sm rounded-xl border border-border/40 hover:bg-background hover:shadow-md text-foreground">
              <div className="flex items-center gap-3">
                <Activity className="size-4 text-muted-foreground group-hover/btn:text-primary transition-colors" />
                <span>Project Settings</span>
              </div>
              <ArrowRight className="size-4 text-muted-foreground/50 group-hover/btn:translate-x-1 group-hover/btn:text-primary transition-all" />
            </Link>
            
            <div className="mt-auto pt-4 relative">
               <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
               <p className="text-xs text-center text-muted-foreground font-medium">
                 Project ID: {activeProject?.id?.substring(0, 8) || "—"}...
               </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

