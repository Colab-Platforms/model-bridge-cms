"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Copy, ArrowLeft } from "lucide-react";
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
    <div className="flex flex-col gap-8 p-6">
      {/* 1. Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link
          href="/models"
          className="transition-colors hover:text-foreground"
        >
          Models
        </Link>
        <span>/</span>
        <span>{model.provider.displayName}</span>
        <span>/</span>
        <span className="text-foreground">{model.displayName}</span>
      </nav>

      {/* 2 + 3 + 4. Title block */}
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          {model.provider.displayName}
        </p>
        <h1 className="text-3xl font-bold">{model.displayName}</h1>

        {/* Slug line with copy button */}
        <div className="flex items-center gap-2">
          <code className="rounded bg-muted px-2 py-1 font-mono text-sm">
            {model.provider.slug}/{model.slug}
          </code>
          <button
            type="button"
            aria-label="Copy slug"
            className="text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              navigator.clipboard.writeText(model.slug);
              toast.success("Slug copied");
            }}
          >
            <Copy className="size-4" />
          </button>
        </div>

        {model.description && (
          <p className="max-w-2xl text-muted-foreground">
            {model.description}
          </p>
        )}
      </div>

      {/* 5. Four stat cards — matches section-cards gradient pattern */}
      <div className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardDescription>Input Price</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatPrice(model.inputPricePer1m)} / 1M
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Output Price</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatPrice(model.outputPricePer1m)} / 1M
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Context Window</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatContextWindow(model.contextLength)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Released</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatReleaseDate(model.releaseDate)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* 6. Capability badges + parameter count */}
      <div className="flex flex-wrap items-center gap-2">
        {model.defaultForCapabilities.map((cap) => (
          <Badge key={cap} className={cn("text-xs", CAPABILITY_COLORS[cap])}>
            {CAPABILITY_LABELS[cap]}
          </Badge>
        ))}
        {model.parameterCount && (
          <span className="text-sm text-muted-foreground">
            {model.parameterCount} parameters
          </span>
        )}
      </div>

      {/* 7. Provider filter link */}
      <div>
        <Link href={`/models?providerId=${model.provider.id}`}>
          <Badge variant="outline">{model.provider.displayName}</Badge>
        </Link>
      </div>

      <Separator />

      {/* Tabs */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pricing">Pricing</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger value="usage">My Usage</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab model={model} />
        </TabsContent>

        <TabsContent value="pricing">
          <PricingTab model={model} />
        </TabsContent>

        <TabsContent value="api">
          <ApiTab
            model={model}
            apiKeyPrefix={firstActiveKey?.keyPrefix ?? null}
          />
        </TabsContent>

        <TabsContent value="usage">
          <MyUsageTab modelId={model.id} isAuthenticated={isAuthenticated} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
