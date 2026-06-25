import { Prisma, UserStatus, WalletTransactionType } from "@prisma/client";
import { QueryBuilderError, buildPrismaQuery } from "prisma-qb";

import prisma from "../../../../prisma.js";
import AppError from "../../../shared/errors/index.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type { AdminOverviewActor, GetAdminOverviewQuery } from "./overview.types.js";
import { cacheGet, cacheSet } from "../../../shared/utils/cache.js";

const TOP_LIMIT = 5;
const RECENT_TRANSACTIONS_LIMIT = 10;
const LOW_BALANCE_THRESHOLD = new Prisma.Decimal(10);

const formatDecimalValue = (
  value: Prisma.Decimal | string | number | null | undefined
): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (value instanceof Prisma.Decimal) {
    return value.toFixed(value.decimalPlaces());
  }

  if (typeof value === "number") {
    return value.toString();
  }

  return value;
};

const getDefaultDateRange = (preset?: GetAdminOverviewQuery["dateRangePreset"]) => {
  const now = new Date();

  switch (preset ?? "weekly") {
    case "today":
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
        ),
        to: now,
        preset: "today" as const,
      };
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

const getDateRange = (query: GetAdminOverviewQuery) => {
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

const buildAdminOverviewQuery = (query: GetAdminOverviewQuery) => {
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

const buildAdminOverviewWhere = (_actor: AdminOverviewActor, query: GetAdminOverviewQuery) => {
  buildAdminOverviewQuery(query);
  const dateRange = getDateRange(query);

  const where: Prisma.InferenceRequestWhereInput = {
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

const userRoleWhere: Prisma.UserWhereInput = {
  isDeleted: false,
  userRoles: {
    some: {
      role: {
        name: "User",
      },
    },
  },
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

const getGroupedCount = (count: true | { _all?: number } | undefined) =>
  typeof count === "object" && count !== null ? count._all ?? 0 : 0;

const getGroupedSumValue = <TKey extends string>(
  sum: Record<TKey, number | Prisma.Decimal | null> | undefined,
  key: TKey
) => sum?.[key] ?? null;

const getGroupedNumericSumValue = <TKey extends string>(
  sum: Record<TKey, number | Prisma.Decimal | null> | undefined,
  key: TKey
) => {
  const value = sum?.[key];
  return typeof value === "number" ? value : null;
};

type TimeseriesRow = {
  bucket: Date;
  requests: bigint | number;
  totalTokens: bigint | number | null;
  providerCost: Prisma.Decimal | string | number | null;
  revenue: Prisma.Decimal | string | number | null;
  totalBilledAmount: Prisma.Decimal | string | number | null;
};

const getAdminOverviewTTL = (preset: string): number => {
  switch (preset) {
    case "today":
    case "past_24h":
      return 90;
    case "weekly":
      return 180;
    case "monthly":
      return 300;
    case "yearly":
    case "custom":
      return 600;
    default:
      return 180;
  }
};

export const getAdminOverviewService = async (
  _actor: AdminOverviewActor,
  query: GetAdminOverviewQuery
) => {
  const { where, dateRange } = buildAdminOverviewWhere(_actor, query);

  const cacheKey = `admin:overview:${dateRange.preset}:${dateRange.from?.toISOString() ?? ""}:${dateRange.to?.toISOString() ?? ""}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return cached;

  const granularity = getTimeseriesGranularity(dateRange.from, dateRange.to);
  const bucketExpression = getBucketExpression(granularity);

  const walletTransactionWhere: Prisma.WalletTransactionWhereInput = {
    wallet: {
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
  };

  const [
    totalUsers,
    activeUsers,
    suspendedUsers,
    inactiveUsers,
    totalProjects,
    activeProjects,
    totalApiKeys,
    activeApiKeys,
    totalProviders,
    activeProviders,
    totalModels,
    activeModels,
    totalWallets,
    activeWallets,
    totalRequests,
    aggregateUsage,
    statusGroups,
    streamGroups,
    topModelGroups,
    topProjectGroups,
    topApiKeyGroups,
    topUserGroups,
    walletTotals,
    walletTransactionsAggregate,
    recentTransactions,
    timeseries,
  ] = await Promise.all([
    prisma.user.count({ where: userRoleWhere }),
    prisma.user.count({ where: { ...userRoleWhere, status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { ...userRoleWhere, status: UserStatus.SUSPENDED } }),
    prisma.user.count({ where: { ...userRoleWhere, status: UserStatus.INACTIVE } }),
    prisma.project.count({ where: { isDeleted: false } }),
    prisma.project.count({ where: { isDeleted: false, isActive: true } }),
    prisma.apiKey.count({ where: { isDeleted: false } }),
    prisma.apiKey.count({ where: { isDeleted: false, status: "ACTIVE" } }),
    prisma.provider.count({ where: { isDeleted: false } }),
    prisma.provider.count({ where: { isDeleted: false, isActive: true } }),
    prisma.model.count({ where: { isDeleted: false } }),
    prisma.model.count({ where: { isDeleted: false, isActive: true } }),
    prisma.wallet.count({ where: { isDeleted: false } }),
    prisma.wallet.count({ where: { isDeleted: false, status: "ACTIVE" } }),
    prisma.inferenceRequest.count({ where }),
    prisma.inferenceRequest.aggregate({
      where,
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
        providerCost: true,
        platformMarkup: true,
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
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
      orderBy: [
        { _count: { modelId: "desc" } },
        { _sum: { totalTokens: "desc" } },
        { _sum: { totalCost: "desc" } },
      ],
      take: TOP_LIMIT,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["projectId"],
      where,
      _count: { _all: true },
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
      _count: { _all: true },
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
    prisma.inferenceRequest.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
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
    prisma.wallet.aggregate({
      where: { isDeleted: false },
      _sum: {
        balance: true,
      },
    }),
    prisma.walletTransaction.aggregate({
      where: walletTransactionWhere,
      _sum: {
        amount: true,
      },
    }),
    prisma.walletTransaction.findMany({
      where: walletTransactionWhere,
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        description: true,
        createdAt: true,
        wallet: {
          select: {
            id: true,
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
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
        COALESCE(SUM(ir."provider_cost"), 0) AS "providerCost",
        COALESCE(SUM(ir."platform_markup"), 0) AS "revenue",
        COALESCE(SUM(ir."total_cost"), 0) AS "totalBilledAmount"
      FROM "inference_requests" ir
      WHERE 1 = 1
        ${dateRange.from ? Prisma.sql`AND ir."created_at" >= ${dateRange.from}` : Prisma.empty}
        ${dateRange.to ? Prisma.sql`AND ir."created_at" <= ${dateRange.to}` : Prisma.empty}
      GROUP BY 1
      ORDER BY 1 ASC
    `),
  ]);

  const [modelRecords, projectRecords, apiKeyRecords, userRecords, providerGroups, walletTransactionGroups] =
    await Promise.all([
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
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
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
              user: {
                select: {
                  id: true,
                  email: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          })
        : Promise.resolve([]),
      topUserGroups.length
        ? prisma.user.findMany({
            where: {
              id: { in: topUserGroups.map((item) => item.userId) },
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              status: true,
            },
          })
        : Promise.resolve([]),
      prisma.inferenceRequest.groupBy({
        by: ["modelId"],
        where,
        _count: { _all: true },
        _sum: {
          totalTokens: true,
          totalCost: true,
        },
      }),
      prisma.walletTransaction.groupBy({
        by: ["type"],
        where: walletTransactionWhere,
        _sum: {
          amount: true,
        },
      }),
    ]);

  const modelMap = new Map(modelRecords.map((item) => [item.id, item]));
  const projectMap = new Map(projectRecords.map((item) => [item.id, item]));
  const apiKeyMap = new Map(apiKeyRecords.map((item) => [item.id, item]));
  const userMap = new Map(userRecords.map((item) => [item.id, item]));

  const providerIds = Array.from(
    new Set(
      providerGroups
        .map((item) => modelMap.get(item.modelId)?.provider.id)
        .filter((value): value is string => Boolean(value))
    )
  );

  const providerRecords = providerIds.length
    ? await prisma.provider.findMany({
        where: {
          id: { in: providerIds },
        },
        select: {
          id: true,
          slug: true,
          displayName: true,
        },
      })
    : [];

  const providerRecordMap = new Map(providerRecords.map((item) => [item.id, item]));
  const providerAggregateMap = new Map<
    string,
    {
      provider: { id: string; slug: string | null; displayName: string | null };
      requests: number;
      totalTokens: number;
      totalCost: Prisma.Decimal;
    }
  >();

  for (const item of providerGroups) {
    const provider = modelMap.get(item.modelId)?.provider;

    if (!provider) {
      continue;
    }

    const current = providerAggregateMap.get(provider.id) ?? {
      provider: providerRecordMap.get(provider.id) ?? provider,
      requests: 0,
      totalTokens: 0,
      totalCost: new Prisma.Decimal(0),
    };

    providerAggregateMap.set(provider.id, {
      provider: current.provider,
      requests: current.requests + getGroupedCount(item._count),
      totalTokens: current.totalTokens + (getGroupedNumericSumValue(item._sum, "totalTokens") ?? 0),
      totalCost: current.totalCost.add(getGroupedSumValue(item._sum, "totalCost") ?? 0),
    });
  }

  const topProviders = Array.from(providerAggregateMap.values())
    .sort((a, b) => b.requests - a.requests)
    .slice(0, TOP_LIMIT);

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
  const successRate =
    totalRequests > 0
      ? Number((((statusCounts.SUCCESS ?? 0) / totalRequests) * 100).toFixed(2))
      : 0;

  const result = {
    summary: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      inactiveUsers,
      totalProjects,
      activeProjects,
      totalApiKeys,
      activeApiKeys,
      totalProviders,
      activeProviders,
      totalModels,
      activeModels,
      totalWallets,
      activeWallets,
      totalWalletBalance: formatDecimalValue(walletTotals._sum.balance) ?? "0",
      totalRequests,
      totalTokens: aggregateUsage._sum.totalTokens ?? 0,
      totalRevenue: formatDecimalValue(aggregateUsage._sum.platformMarkup) ?? "0",
      totalProviderCost: formatDecimalValue(aggregateUsage._sum.providerCost) ?? "0",
      totalBilledAmount: formatDecimalValue(aggregateUsage._sum.totalCost) ?? "0",
      successRate,
      avgLatencyMs: aggregateUsage._avg.latencyMs
        ? Number(aggregateUsage._avg.latencyMs.toFixed(2))
        : 0,
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
        totalProviderCost: formatDecimalValue(aggregateUsage._sum.providerCost) ?? "0",
        totalRevenue: formatDecimalValue(aggregateUsage._sum.platformMarkup) ?? "0",
        totalBilledAmount: formatDecimalValue(aggregateUsage._sum.totalCost) ?? "0",
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
    topProviders: topProviders.map((item) => ({
      providerId: item.provider.id,
      provider: item.provider,
      requests: item.requests,
      totalTokens: item.totalTokens,
      totalCost: formatDecimalValue(item.totalCost) ?? "0",
    })),
    topUsers: topUserGroups.map((item) => {
      const user = userMap.get(item.userId);

      return {
        userId: item.userId,
        email: user?.email ?? null,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        status: user?.status ?? null,
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
        user: project?.user ?? null,
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
          user: apiKey?.user ?? null,
          requests: getGroupedCount(item._count),
          totalTokens: getGroupedSumValue(item._sum, "totalTokens") ?? 0,
          totalCost: formatDecimalValue(getGroupedSumValue(item._sum, "totalCost")) ?? "0",
          lastUsedAt: item._max.createdAt ?? null,
        };
      }),
    },
    wallet: {
      totalWalletBalance: formatDecimalValue(walletTotals._sum.balance) ?? "0",
      totalCreditsAdded:
        formatDecimalValue(
          (walletTransactionMap[WalletTransactionType.TOPUP] ?? new Prisma.Decimal(0)).add(
            walletTransactionMap[WalletTransactionType.CREDIT_GRANT] ?? 0
          )
        ) ?? "0",
      totalUsageDeducted:
        formatDecimalValue(walletTransactionMap[WalletTransactionType.USAGE_DEDUCTION]) ?? "0",
      totalRefunded: formatDecimalValue(walletTransactionMap[WalletTransactionType.REFUND]) ?? "0",
      totalAdjusted:
        formatDecimalValue(walletTransactionMap[WalletTransactionType.ADJUSTMENT]) ?? "0",
      totalTransactionsAmount: formatDecimalValue(walletTransactionsAggregate._sum.amount) ?? "0",
      lowBalanceWalletsCount: await prisma.wallet.count({
        where: {
          isDeleted: false,
          balance: {
            lte: LOW_BALANCE_THRESHOLD,
          },
        },
      }),
      recentTransactions: recentTransactions.map((item) => ({
        id: item.id,
        type: item.type,
        amount: formatDecimalValue(item.amount) ?? "0",
        balanceAfter: formatDecimalValue(item.balanceAfter) ?? "0",
        description: item.description,
        createdAt: item.createdAt,
        walletId: item.wallet.id,
        user: item.wallet.user,
      })),
    },
    charts: {
      granularity,
      usageTrend: timeseries.map((item) => ({
        bucket: item.bucket,
        requests: Number(item.requests ?? 0),
        totalTokens: Number(item.totalTokens ?? 0),
        providerCost: formatDecimalValue(item.providerCost) ?? "0",
        revenue: formatDecimalValue(item.revenue) ?? "0",
        totalBilledAmount: formatDecimalValue(item.totalBilledAmount) ?? "0",
      })),
    },
  };

  await cacheSet(cacheKey, result, getAdminOverviewTTL(dateRange.preset));
  return result;
};
