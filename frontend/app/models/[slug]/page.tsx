"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Copy, ArrowLeft, Server, DollarSign, TerminalSquare, Activity } from "lucide-react";
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
  CardDescription,
  CardHeader,
  CardTitle,
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
      document.title = `${model.displayName} — Models | Model Bridge`;
    }
  }, [model]);

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

  // ── Loaded ───────────────────────────────────────────────────────────────
  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="flex flex-col gap-6 p-6 max-w-5xl mx-auto w-full pt-8"
    >
      {/* 1. Header Block */}
      <motion.div variants={itemVariants} className="flex flex-col gap-4">
        {/* Title */}
        <h1 className="flex items-center text-2xl md:text-3xl font-semibold tracking-tight text-foreground/90 font-serif gap-2">
           {model.provider.displayName}: {model.displayName}
        </h1>

        {/* Slug line with copy button */}
        <div className="flex items-center gap-2 -mt-2">
          <code className="text-muted-foreground text-sm font-medium">
            {model.provider.slug}/{model.slug}
          </code>
          <button
            type="button"
            aria-label="Copy slug"
            className="text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground rounded-md border border-border/40 p-1 bg-background"
            onClick={() => {
              navigator.clipboard.writeText(model.slug);
              toast.success("Slug copied");
            }}
          >
            <Copy className="size-3.5" />
          </button>
        </div>

        {/* Description */}
        {model.description && (
          <p className="max-w-4xl text-sm text-foreground/80 leading-relaxed mt-1">
            {model.description}
          </p>
        )}
      </motion.div>

      {/* 2. Four stat cards matching the requested image */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 gap-3 lg:grid-cols-4 mt-2 mb-2">
         {/* Modalities */}
         <div className="rounded-2xl bg-muted/30 p-4 border border-border/40 hover:bg-muted/50 transition-colors shadow-sm">
           <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Modalities</div>
           <div className="flex flex-wrap gap-1.5 items-center text-sm font-medium">
             <span className="text-primary tracking-wide">
               {model.inputModalities.map(m => MODALITY_LABELS[m] ?? m).join(", ")}
             </span>
             <span className="text-muted-foreground text-[10px] mx-1">→</span>
             <span className="text-primary tracking-wide">
               {model.outputModalities.map(m => MODALITY_LABELS[m] ?? m).join(", ")}
             </span>
           </div>
         </div>

         {/* Price */}
         <div className="rounded-2xl bg-muted/30 p-4 flex flex-col justify-center border border-border/40 hover:bg-muted/50 transition-colors shadow-sm">
           <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex justify-between items-center">
              Price
              {model.inputPricePer1m === "0" && <span className="text-[9px] font-bold text-muted-foreground">Low</span>}
           </div>
           <div className="text-sm font-semibold text-foreground">
             {model.inputPricePer1m === "0" ? "Free" : formatPrice(model.inputPricePer1m)}
           </div>
         </div>

         {/* Context */}
         <div className="rounded-2xl bg-muted/30 p-4 flex flex-col justify-center border border-border/40 hover:bg-muted/50 transition-colors shadow-sm">
           <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex justify-between items-center">
              Context
              {model.contextLength <= 32000 && <span className="text-[9px] font-bold text-muted-foreground">Low</span>}
           </div>
           <div className="text-sm font-semibold text-foreground">
             {formatContextWindow(model.contextLength)}
           </div>
         </div>

         {/* Released */}
         <div className="rounded-2xl bg-muted/30 p-4 flex flex-col justify-center border border-border/40 hover:bg-muted/50 transition-colors shadow-sm">
           <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Released</div>
           <div className="text-sm font-semibold text-foreground">
             {formatReleaseDate(model.releaseDate)}
           </div>
         </div>
      </motion.div>

      <Separator className="opacity-40" />

      {/* 3. Vertical Tabs / Layout */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="overview" className="flex flex-col md:flex-row gap-8 items-start mb-20 mt-2">
          {/* Sidebar Tabs */}
          <TabsList className="flex flex-row md:flex-col h-auto bg-transparent items-stretch w-full md:w-56 space-x-2 md:space-x-0 md:space-y-1 p-0 shrink-0 overflow-x-auto pb-2 md:pb-0 scrollbar-hide border-b md:border-b-0 border-border/40">
            <TabsTrigger 
              value="overview" 
              className="justify-start data-[state=active]:bg-card/80 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground data-[state=active]:text-foreground bg-transparent border border-transparent data-[state=active]:border-border/40 rounded-xl px-4 py-2.5 transition-all hover:bg-muted/50 text-sm whitespace-nowrap"
            >
              <Server className="size-[18px] mr-3 shrink-0 opacity-70" />
              Providers
            </TabsTrigger>
            <TabsTrigger 
              value="pricing" 
              className="justify-start data-[state=active]:bg-card/80 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground data-[state=active]:text-foreground bg-transparent border border-transparent data-[state=active]:border-border/40 rounded-xl px-4 py-2.5 transition-all hover:bg-muted/50 text-sm whitespace-nowrap"
            >
              <DollarSign className="size-[18px] mr-3 shrink-0 opacity-70" />
              Pricing
            </TabsTrigger>
            <TabsTrigger 
              value="api" 
              className="justify-start data-[state=active]:bg-card/80 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground data-[state=active]:text-foreground bg-transparent border border-transparent data-[state=active]:border-border/40 rounded-xl px-4 py-2.5 transition-all hover:bg-muted/50 text-sm whitespace-nowrap"
            >
              <TerminalSquare className="size-[18px] mr-3 shrink-0 opacity-70" />
              Quick Start
            </TabsTrigger>
            {isAuthenticated && (
              <TabsTrigger 
                value="usage" 
                className="justify-start data-[state=active]:bg-card/80 data-[state=active]:backdrop-blur-sm data-[state=active]:shadow-sm data-[state=active]:font-semibold text-muted-foreground data-[state=active]:text-foreground bg-transparent border border-transparent data-[state=active]:border-border/40 rounded-xl px-4 py-2.5 transition-all hover:bg-muted/50 text-sm whitespace-nowrap"
              >
                <Activity className="size-[18px] mr-3 shrink-0 opacity-70" />
                Activity
              </TabsTrigger>
            )}
          </TabsList>

          {/* Content Area */}
          <div className="flex-1 w-full min-w-0">
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
          </div>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
