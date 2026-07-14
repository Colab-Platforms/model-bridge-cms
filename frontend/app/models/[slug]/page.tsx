"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Copy, ArrowLeft, Server, DollarSign, TerminalSquare, Activity, BrainCircuit, ChevronRight, Code2 } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useModelBySlug } from "@/hooks/useModels";
import { useAuthStore } from "@/store/authStore";
import {
  formatContextWindow,
  formatPrice,
  isNewModel,
  CAPABILITY_LABELS,
  CAPABILITY_COLORS,
  MODALITY_LABELS,
  MODALITY_COLORS,
} from "@/lib/modelUtils";

import { OverviewTab } from "@/components/models/tabs/OverviewTab";
import { PricingTab } from "@/components/models/tabs/PricingTab";
import { ApiTab } from "@/components/models/tabs/ApiTab";
import { MyUsageTab } from "@/components/models/tabs/MyUsageTab";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { ApiKey } from "@/types/index";

function formatReleaseDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 30 } },
};

export default function ModelDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { model, isLoading, isError } = useModelBySlug(slug);
  const { user } = useAuthStore();
  const isAuthenticated = !!user;
  const [activeTab, setActiveTab] = useState("overview");
  const tabsSectionRef = useRef<HTMLDivElement>(null);

  // Fetch API keys to pre-fill the ApiTab snippet (only when authenticated)
  const { data: keysData } = useQuery<ApiKey[]>({
    queryKey: ["keys"],
    queryFn: () => api.get<ApiKey[]>("/api-keys").then((r) => r.data),
    enabled: isAuthenticated,
  });
  const firstActiveKey = keysData?.find((k) => k.status === "ACTIVE") ?? null;

  // Set page title once the model loads
  useEffect(() => {
    if (model) {
      document.title = `${model.displayName} — Models | Colab One`;
    }
  }, [model]);

  const handleUseModel = () => {
    setActiveTab("api");
    tabsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col gap-8 p-6">
        <Skeleton className="h-4 w-64" />
        <div className="flex flex-col gap-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-96 max-w-full" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-full max-w-2xl" />
          <Skeleton className="h-4 w-3/4 max-w-xl" />
        </div>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-9 w-80" />
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────
  if (isError || !model) {
    return (
      <div className="flex items-center justify-center p-6 pt-20">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-lg font-semibold">Model not found</p>
            <p className="text-center text-sm text-muted-foreground">
              The model &apos;{slug}&apos; does not exist or has been
              deactivated.
            </p>
            <Button asChild>
              <Link href="/models">
                <ArrowLeft className="mr-2 size-4" />
                Back to models
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bothPricesZero = model.inputPricePer1m === "0" && model.outputPricePer1m === "0";
  const contextFillPct = model.contextLength != null
    ? Math.min(100, (model.contextLength / 1_000_000) * 100)
    : 0;

  // ── Loaded ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full pt-8"
    >
      {/* Breadcrumb nav — always visible */}
      <motion.nav variants={itemVariants} className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/models" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <ArrowLeft className="size-3.5" />
          Models
        </Link>
        <ChevronRight className="size-3.5 text-muted-foreground/40" />
        <span className="text-foreground font-medium truncate max-w-xs">{model.displayName}</span>
      </motion.nav>

      {/* 1. Header Block */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        {/* Logo + provider + name row, with primary CTA */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="size-14 rounded-2xl bg-muted/50 border border-border/60 flex items-center justify-center shrink-0 overflow-hidden shadow-sm">
              {model.provider.providerLogo
                ? <img src={model.provider.providerLogo} alt={model.provider.displayName} className="size-full object-contain p-2" />
                : <BrainCircuit className="size-6 text-muted-foreground" />
              }
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-xs text-muted-foreground font-medium">{model.provider.displayName}</p>
                {isNewModel(model.releaseDate) && (
                  <Badge className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] border border-green-200 dark:border-green-800/50 animate-pulse px-1.5">
                    New
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90 font-serif">
                {model.displayName}
              </h1>
            </div>
          </div>

          <Button onClick={handleUseModel} className="w-full md:w-auto shrink-0">
            Use this model
          </Button>
        </div>

        {/* Slug copy pill */}
        <div className="flex items-center bg-muted/40 rounded-full pl-3 pr-1.5 py-1 w-fit border border-border/40 -mt-1 divide-x divide-border/50">
          <div className="flex items-center gap-2 pr-3">
            <Code2 className="size-3.5 text-muted-foreground shrink-0" />
            <code className="text-sm text-muted-foreground font-mono">
              {model.provider.slug}/{model.slug}
            </code>
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 pl-3 pr-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              navigator.clipboard.writeText(model.slug);
              toast.success("Slug copied");
            }}
          >
            <Copy className="size-3.5" />
            Copy
          </button>
        </div>

        {/* Capability + modality badges — surfaced here instead of buried in a tab */}
        {(model.defaultForCapabilities.length > 0 || model.inputModalities.length > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {model.defaultForCapabilities.map((cap) => (
              <Badge key={cap} className={cn("text-xs font-medium shadow-sm", CAPABILITY_COLORS[cap])}>
                {CAPABILITY_LABELS[cap]}
              </Badge>
            ))}
            {model.defaultForCapabilities.length > 0 && model.inputModalities.length > 0 && (
              <span className="text-muted-foreground/40 text-xs mx-0.5">·</span>
            )}
            {model.inputModalities.map((m) => (
              <Badge key={`in-${m}`} variant="outline" className="text-xs text-muted-foreground">
                {MODALITY_LABELS[m] ?? m}
              </Badge>
            ))}
          </div>
        )}

        {/* Description */}
        {model.description && (
          <p className="max-w-4xl text-sm text-foreground/80 leading-relaxed">
            {model.description}
          </p>
        )}
      </motion.div>

      {/* 2. Four stat cards — three neutral, one accent */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {/* Modalities */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 hover:bg-muted/50 transition-colors shadow-sm">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Modalities</span>
          <div className="text-sm font-medium text-foreground leading-snug mt-2.5">
            {model.inputModalities.map(m => MODALITY_LABELS[m] ?? m).join(", ")}
            <span className="text-muted-foreground/50 text-xs mx-1">→</span>
            {model.outputModalities.map(m => MODALITY_LABELS[m] ?? m).join(", ")}
          </div>
        </div>

        {/* Pricing — accent card, input + output combined */}
        <div className="rounded-2xl bg-primary/10 border border-primary/25 p-4 shadow-sm">
          <span className="text-[10px] font-semibold text-primary/80 uppercase tracking-wider">Pricing</span>
          <div className="text-sm font-semibold text-primary mt-2.5">
            {bothPricesZero ? "Free" : `${formatPrice(model.inputPricePer1m)} / ${formatPrice(model.outputPricePer1m)}`}
          </div>
          <div className="text-[10px] text-primary/70 mt-0.5">
            {bothPricesZero ? "no cost" : "per 1M tokens (in / out)"}
          </div>
        </div>

        {/* Context */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 hover:bg-muted/50 transition-colors shadow-sm">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Context</span>
          <div className="text-sm font-semibold text-foreground mt-2.5">
            {formatContextWindow(model.contextLength)}
          </div>
          {model.contextLength != null && (
            <>
              <div className="text-[10px] text-muted-foreground mt-0.5 mb-1.5">
                {model.contextLength.toLocaleString()} tokens
              </div>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-foreground/50"
                  style={{ width: `${contextFillPct}%` }}
                />
              </div>
            </>
          )}
        </div>

        {/* Released */}
        <div className="rounded-2xl bg-muted/30 border border-border/40 p-4 hover:bg-muted/50 transition-colors shadow-sm">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Released</span>
          <div className="text-sm font-semibold text-foreground mt-2.5">
            {formatReleaseDate(model.releaseDate)}
          </div>
        </div>
      </motion.div>

      <Separator className="opacity-40" />

      {/* 3. Horizontal underline tabs */}
      <motion.div ref={tabsSectionRef} variants={itemVariants}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-20 mt-2">
          <TabsList variant="line" className="w-full justify-start gap-6 bg-transparent border-b border-border/50">
            <TabsTrigger value="overview" className="gap-2 px-1 text-sm">
              <Server className="size-[15px] shrink-0 opacity-70" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="pricing" className="gap-2 px-1 text-sm">
              <DollarSign className="size-[15px] shrink-0 opacity-70" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="api" className="gap-2 px-1 text-sm">
              <TerminalSquare className="size-[15px] shrink-0 opacity-70" />
              Quick Start
            </TabsTrigger>
            {isAuthenticated && (
              <TabsTrigger value="usage" className="gap-2 px-1 text-sm">
                <Activity className="size-[15px] shrink-0 opacity-70" />
                My Usage
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="mt-0 outline-none">
            <OverviewTab model={model} />
          </TabsContent>
          <TabsContent value="pricing" className="mt-0 outline-none">
            <PricingTab model={model} />
          </TabsContent>
          <TabsContent value="api" className="mt-0 outline-none">
            <ApiTab model={model} apiKeyPrefix={firstActiveKey?.keyPrefix ?? null} />
          </TabsContent>
          {isAuthenticated && (
            <TabsContent value="usage" className="mt-0 outline-none">
              <MyUsageTab modelId={model.id} isAuthenticated={isAuthenticated} />
            </TabsContent>
          )}
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
