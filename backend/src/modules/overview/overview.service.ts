import { Prisma, WalletTransactionType } from "@prisma/client";
import { QueryBuilderError, buildPrismaQuery } from "prisma-qb";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type { GetOverviewQuery, OverviewActor } from "./overview.types.js";

const TOP_LIMIT = 5;
const RECENT_TRANSACTIONS_LIMIT = 5;
const LOW_BALANCE_THRESHOLD = new Prisma.Decimal(10);

const formatDecimalValue = (
  value: Prisma.Decimal | string | number | null | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Prisma.Decimal) {
    const decimalPlaces = value.decimalPlaces();
    return value.toFixed(decimalPlaces);
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return value;
};

const getDefaultDateRange = (preset?: GetOverviewQuery["dateRangePreset"]) => {
  const now = new Date();

  switch (preset ?? "weekly") {
    case "today": {
      const from = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
      );

      return { from, to: now, preset: "today" as const };
    }
    case "past_24h":
      return {
        from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        to: now,
        preset: "past_24h" as const,
      };
    case "monthly":
      return {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        to: now,
        preset: "monthly" as const,
      };
    case "yearly":
      return {
        from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        to: now,
        preset: "yearly" as const,
      };
    case "custom":
      return { from: undefined, to: undefined, preset: "custom" as const };
    case "weekly":
    default:
      return {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: now,
        preset: "weekly" as const,
      };
  }
};

const getDateRange = (query: GetOverviewQuery) => {
  if (query.from || query.to) {
    return {
      from: query.from,
      to: query.to,
      preset: query.dateRangePreset ?? "custom",
    };
  }

  return getDefaultDateRange(query.dateRangePreset);
};

const getTimeseriesGranularity = (from?: Date, to?: Date) => {
  if (!from || !to) {
    return "day" as const;
  }

  const rangeMs = to.getTime() - from.getTime();
  const hours = rangeMs / (60 * 60 * 1000);
  const days = rangeMs / (24 * 60 * 60 * 1000);

  if (hours <= 48) {
    return "hour" as const;
  }

  if (days <= 90) {
    return "day" as const;
  }

  return "month" as const;
};

const getBucketExpression = (granularity: "hour" | "day" | "month") => {
  switch (granularity) {
    case "hour":
      return Prisma.sql`DATE_TRUNC('hour', ir."created_at")`;
    case "month":
      return Prisma.sql`DATE_TRUNC('month', ir."created_at")`;
    case "day":
    default:
      return Prisma.sql`DATE_TRUNC('day', ir."created_at")`;
  }
};

const buildOverviewQuery = (query: GetOverviewQuery) => {
  try {
    return buildPrismaQuery({
      query,
      filterFields: [],
      sortFields: [],
      strict: true,
      allowedQueryKeys: ["dateRangePreset", "from", "to"],
    });
  } catch (error) {
    if (error instanceof QueryBuilderError) {
      throw new AppError(error.message, STATUS_CODES.BAD_REQUEST);
    }

    throw error;
  }
};

const buildOverviewWhere = (actor: OverviewActor, query: GetOverviewQuery) => {
  buildOverviewQuery(query);
  const dateRange = getDateRange(query);

  const where: Prisma.InferenceRequestWhereInput = {
    userId: actor.id,
    ...(dateRange.from || dateRange.to
      ? {
          createdAt: {
            ...(dateRange.from ? { gte: dateRange.from } : {}),
            ...(dateRange.to ? { lte: dateRange.to } : {}),
          },
        }
      : {}),
  };

  return { where, dateRange };
};

const toCountMap = <TRow extends Record<string, unknown> & { _count: { _all: number } }>(
  rows: TRow[],
  keyName: keyof TRow
) =>
  rows.reduce<Record<string, number>>((acc, row) => {
    const key = row[keyName];

    if (typeof key === "string" || typeof key === "boolean") {
      acc[String(key)] = row._count._all;
    }

    return acc;
  }, {});

type TimeseriesRow = {
  bucket: Date;
  requests: bigint | number;
  totalTokens: bigint | number | null;
  totalCost: Prisma.Decimal | string | number | null;
};

const getGroupedCount = (count: true | { _all?: number } | undefined) =>
  typeof count === "object" && count !== null ? count._all ?? 0 : 0;

const getGroupedSumValue = <TKey extends string>(
  sum: Record<TKey, number | Prisma.Decimal | null> | undefined,
  key: TKey
) => sum?.[key] ?? null;

export const getOverviewService = async (actor: OverviewActor, query: GetOverviewQuery) => {
  const { where, dateRange } = buildOverviewWhere(actor, query);
  const granularity = getTimeseriesGranularity(dateRange.from, dateRange.to);
  const bucketExpression = getBucketExpression(granularity);

  const [
    totalRequests,
    aggregateUsage,
    statusGroups,
    streamGroups,
    topModelGroups,
    topProjectGroups,
    topApiKeyGroups,
    activeProjectsCount,
    activeApiKeysCount,
    wallet,
    walletTransactionsAggregate,
    recentTransactions,
    timeseries,
  ] = await Promise.all([
    prisma.inferenceRequest.count({ where }),
    prisma.inferenceRequest.aggregate({
      where,
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        totalCost: true,
      },
      _avg: {
        latencyMs: true,
      },
    }),
    prisma.inferenceRequest.groupBy({
      by: ["status"],
      where,
      _count: {
        _all: true,
      },
    }),
    prisma.inferenceRequest.groupBy({
      by: ["stream"],
      where,
      _count: {
        _all: true,
      },
    }),
    prisma.inferenceRequest.groupBy({
      by: ["modelId"],
      where,
      _count: {
        _all: true,
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
      orderBy: [
        {
          _count: {
            modelId: "desc",
          },
        },
        {
          _sum: {
            totalTokens: "desc",
          },
        },
        {
          _sum: {
            totalCost: "desc",
          },
        },
      ],
      take: TOP_LIMIT,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["projectId"],
      where,
      _count: {
        _all: true,
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
      orderBy: {
        _sum: {
          totalCost: "desc",
        },
      },
      take: TOP_LIMIT,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["apiKeyId"],
      where,
      _count: {
        _all: true,
      },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
      _max: {
        createdAt: true,
      },
      orderBy: {
        _sum: {
          totalCost: "desc",
        },
      },
      take: TOP_LIMIT,
    }),
    prisma.project.count({
      where: {
        userId: actor.id,
        isDeleted: false,
        isActive: true,
      },
    }),
    prisma.apiKey.count({
      where: {
        userId: actor.id,
        isDeleted: false,
        status: "ACTIVE",
      },
    }),
    prisma.wallet.findFirst({
      where: {
        userId: actor.id,
        isDeleted: false,
      },
      select: {
        id: true,
        balance: true,
        currency: true,
        status: true,
      },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        wallet: {
          userId: actor.id,
          isDeleted: false,
        },
        isDeleted: false,
        ...(dateRange.from || dateRange.to
          ? {
              createdAt: {
                ...(dateRange.from ? { gte: dateRange.from } : {}),
                ...(dateRange.to ? { lte: dateRange.to } : {}),
              },
            }
          : {}),
      },
      _sum: {
        amount: true,
      },
    }),
    prisma.walletTransaction.findMany({
      where: {
        wallet: {
          userId: actor.id,
          isDeleted: false,
        },
        isDeleted: false,
      },
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: RECENT_TRANSACTIONS_LIMIT,
    }),
    prisma.$queryRaw<TimeseriesRow[]>(Prisma.sql`
      SELECT
        ${bucketExpression} AS "bucket",
        COUNT(*) AS "requests",
        COALESCE(SUM(ir."total_tokens"), 0) AS "totalTokens",
        COALESCE(SUM(ir."total_cost"), 0) AS "totalCost"
      FROM "inference_requests" ir
      WHERE ir."user_id" = ${actor.id}
        ${dateRange.from ? Prisma.sql`AND ir."created_at" >= ${dateRange.from}` : Prisma.empty}
        ${dateRange.to ? Prisma.sql`AND ir."created_at" <= ${dateRange.to}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
  ]);

  const [modelRecords, projectRecords, apiKeyRecords, walletTransactionGroups] = await Promise.all([
    topModelGroups.length
      ? prisma.model.findMany({
          where: {
            id: { in: topModelGroups.map((item) => item.modelId) },
          },
          select: {
            id: true,
            slug: true,
            displayName: true,
            provider: {
              select: {
                id: true,
                slug: true,
                displayName: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    topProjectGroups.length
      ? prisma.project.findMany({
          where: {
            id: { in: topProjectGroups.map((item) => item.projectId) },
          },
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
          },
        })
      : Promise.resolve([]),
    topApiKeyGroups.length
      ? prisma.apiKey.findMany({
          where: {
            id: { in: topApiKeyGroups.map((item) => item.apiKeyId) },
          },
          select: {
            id: true,
            name: true,
            keyPrefix: true,
            status: true,
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    prisma.walletTransaction.groupBy({
      by: ["type"],
      where: {
        wallet: {
          userId: actor.id,
          isDeleted: false,
        },
        isDeleted: false,
        ...(dateRange.from || dateRange.to
          ? {
              createdAt: {
                ...(dateRange.from ? { gte: dateRange.from } : {}),
                ...(dateRange.to ? { lte: dateRange.to } : {}),
              },
            }
          : {}),
      },
      _sum: {
        amount: true,
      },
    }),
  ]);

  const modelMap = new Map(modelRecords.map((item) => [item.id, item]));
  const projectMap = new Map(projectRecords.map((item) => [item.id, item]));
  const apiKeyMap = new Map(apiKeyRecords.map((item) => [item.id, item]));

  const statusCounts = toCountMap(statusGroups, "status");
  const streamCounts = toCountMap(streamGroups, "stream");
  const walletTransactionMap = walletTransactionGroups.reduce<Record<string, Prisma.Decimal | null>>(
    (acc, item) => {
      acc[item.type] = item._sum.amount;
      return acc;
    },
    {}
  );

  const totalFailedRequests = statusCounts.FAILED ?? 0;
  const successRate = totalRequests > 0 ? Number((((statusCounts.SUCCESS ?? 0) / totalRequests) * 100).toFixed(2)) : 0;

  return {
    summary: {
      walletBalance: formatDecimalValue(wallet?.balance) ?? "0",
      currency: wallet?.currency ?? "USD",
      walletStatus: wallet?.status ?? null,
      totalSpend: formatDecimalValue(aggregateUsage._sum.totalCost) ?? "0",
      totalRequests,
      totalTokens: aggregateUsage._sum.totalTokens ?? 0,
      activeProjects: activeProjectsCount,
      activeApiKeys: activeApiKeysCount,
      successRate,
      avgLatencyMs: aggregateUsage._avg.latencyMs ? Number(aggregateUsage._avg.latencyMs.toFixed(2)) : 0,
    },
    usage: {
      requestsByStatus: {
        success: statusCounts.SUCCESS ?? 0,
        failed: totalFailedRequests,
        stopped: statusCounts.STOPPED ?? 0,
        pending: statusCounts.PENDING ?? 0,
        partial: statusCounts.PARTIAL ?? 0,
      },
      tokensBreakdown: {
        prompt: aggregateUsage._sum.promptTokens ?? 0,
        completion: aggregateUsage._sum.completionTokens ?? 0,
        total: aggregateUsage._sum.totalTokens ?? 0,
      },
      costBreakdown: {
        totalBilledCost: formatDecimalValue(aggregateUsage._sum.totalCost) ?? "0",
      },
      streamVsNonStream: {
        stream: streamCounts.true ?? 0,
        nonStream: streamCounts.false ?? 0,
      },
      dateRange: {
        preset: dateRange.preset,
        from: dateRange.from ?? null,
        to: dateRange.to ?? null,
      },
    },
    topModels: topModelGroups.map((item) => {
      const model = modelMap.get(item.modelId);

      return {
        modelId: item.modelId,
        slug: model?.slug ?? null,
        displayName: model?.displayName ?? null,
        provider: model?.provider ?? null,
        requests: getGroupedCount(item._count),
        totalTokens: getGroupedSumValue(item._sum, "totalTokens") ?? 0,
        totalCost: formatDecimalValue(getGroupedSumValue(item._sum, "totalCost")) ?? "0",
      };
    }),
    topProjects: topProjectGroups.map((item) => {
      const project = projectMap.get(item.projectId);

      return {
        projectId: item.projectId,
        name: project?.name ?? null,
        slug: project?.slug ?? null,
        isActive: project?.isActive ?? false,
        requests: getGroupedCount(item._count),
        totalTokens: getGroupedSumValue(item._sum, "totalTokens") ?? 0,
        totalCost: formatDecimalValue(getGroupedSumValue(item._sum, "totalCost")) ?? "0",
      };
    }),
    apiKeys: {
      topApiKeys: topApiKeyGroups.map((item) => {
        const apiKey = apiKeyMap.get(item.apiKeyId);

        return {
          apiKeyId: item.apiKeyId,
          name: apiKey?.name ?? null,
          keyPrefix: apiKey?.keyPrefix ?? null,
          status: apiKey?.status ?? null,
          project: apiKey?.project ?? null,
          requests: getGroupedCount(item._count),
          totalTokens: getGroupedSumValue(item._sum, "totalTokens") ?? 0,
          totalCost: formatDecimalValue(getGroupedSumValue(item._sum, "totalCost")) ?? "0",
          lastUsedAt: item._max.createdAt ?? null,
        };
      }),
    },
    wallet: {
      currentBalance: formatDecimalValue(wallet?.balance) ?? "0",
      currency: wallet?.currency ?? "USD",
      lowBalanceAlert: wallet?.balance ? wallet.balance.lessThanOrEqualTo(LOW_BALANCE_THRESHOLD) : false,
      totalCreditsAdded: formatDecimalValue(walletTransactionMap[WalletTransactionType.TOPUP]) ?? "0",
      totalUsageDeducted:
        formatDecimalValue(walletTransactionMap[WalletTransactionType.USAGE_DEDUCTION]) ?? "0",
      totalRefunded: formatDecimalValue(walletTransactionMap[WalletTransactionType.REFUND]) ?? "0",
      totalTransactionsAmount: formatDecimalValue(walletTransactionsAggregate._sum.amount) ?? "0",
      recentTransactions: recentTransactions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: formatDecimalValue(item.amount) ?? "0",
        balanceAfter: formatDecimalValue(item.balanceAfter) ?? "0",
        description: item.description,
        createdAt: item.createdAt,
      })),
    },
    charts: {
      granularity,
      usageTrend: timeseries.map((item) => ({
        bucket: item.bucket,
        requests: Number(item.requests ?? 0),
        totalTokens: Number(item.totalTokens ?? 0),
        totalCost: formatDecimalValue(item.totalCost) ?? "0",
      })),
    },
  };
};
