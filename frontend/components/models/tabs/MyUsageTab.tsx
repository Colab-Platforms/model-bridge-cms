"use client";

import Link from "next/link";
import { useModelUsageStats } from "@/hooks/useModels";
import { formatPrice } from "@/lib/modelUtils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface MyUsageTabProps {
  modelId: string;
  isAuthenticated: boolean;
}

export function MyUsageTab({ modelId, isAuthenticated }: MyUsageTabProps) {
  if (!isAuthenticated) {
    return (
      <div className="mt-6 flex items-center justify-center py-10">
        <Card className="w-full max-w-sm">
          <CardContent className="flex flex-col items-center gap-4 py-10">
            <p className="text-center text-sm text-muted-foreground">
              Sign in to see your usage for this model
            </p>
            <Button asChild>
              <Link href="/auth/login">Sign in</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AuthenticatedUsage modelId={modelId} />;
}

function AuthenticatedUsage({ modelId }: { modelId: string }) {
  const { stats, isLoading, isError, refetch } = useModelUsageStats(modelId, true);

  if (isLoading) {
    return (
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center gap-4 py-10">
        <p className="text-sm text-muted-foreground">
          Could not load usage stats
        </p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  const lastUsed = stats.lastUsedAt
    ? new Date(stats.lastUsedAt).toLocaleDateString()
    : "Never";

  return (
    <div className="mt-6 flex flex-col gap-6">
      {/* Stat cards — section-cards pattern */}
      <div className="grid grid-cols-2 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs lg:grid-cols-4 dark:*:data-[slot=card]:bg-card">
        <Card>
          <CardHeader>
            <CardDescription>Total Requests</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {stats.totalRequests.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Prompt Tokens</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {stats.totalPromptTokens.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Completion Tokens</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {stats.totalCompletionTokens.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Spend</CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums">
              {formatPrice(stats.totalCostUsd)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <p className="text-sm text-muted-foreground">
        Last used: {lastUsed}
      </p>

      <div>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/usage?modelId=${modelId}`}>
            View full usage logs →
          </Link>
        </Button>
      </div>
    </div>
  );
}
