import { Prisma } from "@prisma/client";
import { QueryBuilderError, buildPrismaQuery } from "prisma-qb";

import prisma from "../../../../prisma.js";
import AppError from "../../../shared/errors/index.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../../utils/paginationUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type {
  AdminRevenueActor,
  AdminRevenueByApiKeysQuery,
  AdminRevenueByModelsQuery,
  AdminRevenueByProjectsQuery,
  AdminRevenueByProvidersQuery,
  AdminRevenueByUsersQuery,
  AdminRevenueSummaryQuery,
  AdminRevenueTimeseriesQuery,
} from "./revenue.types.js";

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

const getDefaultDateRange = (preset?: AdminRevenueSummaryQuery["dateRangePreset"]) => {
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

const getDateRange = (
  query: AdminRevenueSummaryQuery | AdminRevenueTimeseriesQuery | AdminRevenueByUsersQuery
) => {
  if (query.from || query.to) {
    return {
      from: query.from,
      to: query.to,
      preset: query.dateRangePreset ?? "custom",
    };
  }

  return getDefaultDateRange(query.dateRangePreset);
};

const getTimeseriesGranularity = (
  query: AdminRevenueTimeseriesQuery,
  from?: Date,
  to?: Date
) => {
  if (query.granularity) {
    return query.granularity;
  }

  if (!from || !to) {
    return "day";
  }

  const rangeMs = to.getTime() - from.getTime();
  const days = rangeMs / (24 * 60 * 60 * 1000);

  if (days <= 2) {
    return "hour";
  }

  if (days <= 90) {
    return "day";
  }

  if (days <= 365) {
    return "week";
  }

  return "month";
};

const getBucketExpression = (granularity: "hour" | "day" | "week" | "month") => {
  switch (granularity) {
    case "hour":
      return Prisma.sql`DATE_TRUNC('hour', ir."created_at")`;
    case "week":
      return Prisma.sql`DATE_TRUNC('week', ir."created_at")`;
    case "month":
      return Prisma.sql`DATE_TRUNC('month', ir."created_at")`;
    case "day":
    default:
      return Prisma.sql`DATE_TRUNC('day', ir."created_at")`;
  }
};

const hasAndConditions = (
  where: Prisma.InferenceRequestWhereInput
): where is { AND: Prisma.InferenceRequestWhereInput[] } =>
  "AND" in where && Array.isArray(where.AND);

const appendCondition = (conditions: Prisma.Sql[], condition: Prisma.Sql | null) => {
  if (condition) {
    conditions.push(condition);
  }
};

const buildRevenueQuery = (
  query:
    | AdminRevenueSummaryQuery
    | AdminRevenueTimeseriesQuery
    | AdminRevenueByUsersQuery
    | AdminRevenueByModelsQuery
    | AdminRevenueByProvidersQuery
    | AdminRevenueByProjectsQuery
    | AdminRevenueByApiKeysQuery
) => {
  try {
    return buildPrismaQuery({
      query,
      searchFields: [
        { field: "requestedModelSlug" },
        { field: "resolvedModelSlug" },
        { field: "email", model: "user" },
        { field: "firstName", model: "user" },
        { field: "lastName", model: "user" },
        { field: "name", model: "apiKey" },
        { field: "keyPrefix", model: "apiKey", operator: "startsWith" },
        { field: "name", model: "project" },
        { field: "displayName", model: "model" },
        { field: "displayName", model: "model.provider" },
      ],
      filterFields: [
        { key: "userId", field: "userId", type: "string" },
        { key: "projectId", field: "projectId", type: "string" },
        { key: "apiKeyId", field: "apiKeyId", type: "string" },
        { key: "modelId", field: "modelId", type: "string" },
        { key: "providerId", field: "providerId", model: "model", type: "string" },
        { key: "status", field: "status", type: "enum" },
        { key: "requestType", field: "requestType", type: "enum" },
        { key: "stream", field: "stream", type: "boolean" },
      ],
      sortFields: [
        { key: "createdAt", field: "createdAt" },
        { key: "providerCost", field: "providerCost" },
        { key: "platformMarkup", field: "platformMarkup" },
        { key: "totalCost", field: "totalCost" },
        { key: "totalTokens", field: "totalTokens" },
      ],
      defaultSort: { key: "createdAt", order: "desc" },
      strict: true,
      allowedQueryKeys: [
        "page",
        "pageSize",
        "dateRangePreset",
        "from",
        "to",
        "granularity",
        "userId",
        "projectId",
        "apiKeyId",
        "modelId",
        "providerId",
        "status",
        "requestType",
        "stream",
        "search",
      ],
    });
  } catch (error) {
    if (error instanceof QueryBuilderError) {
      throw new AppError(error.message, STATUS_CODES.BAD_REQUEST);
    }

    throw error;
  }
};

const buildRevenueWhere = (
  query:
    | AdminRevenueSummaryQuery
    | AdminRevenueTimeseriesQuery
    | AdminRevenueByUsersQuery
    | AdminRevenueByModelsQuery
    | AdminRevenueByProvidersQuery
    | AdminRevenueByProjectsQuery
    | AdminRevenueByApiKeysQuery
) => {
  const qbQuery = buildRevenueQuery(query);
  const dateRange = getDateRange(query);
  const andConditions: Prisma.InferenceRequestWhereInput[] = [];

  if (hasAndConditions(qbQuery.where)) {
    andConditions.push(...qbQuery.where.AND);
  }

  if (dateRange.from || dateRange.to) {
    andConditions.push({
      createdAt: {
        ...(dateRange.from ? { gte: dateRange.from } : {}),
        ...(dateRange.to ? { lte: dateRange.to } : {}),
      },
    });
  }

  return {
    where: andConditions.length ? { AND: andConditions } : {},
    meta: qbQuery.meta,
    dateRange,
  };
};

type RevenueTimeseriesRow = {
  bucket: Date;
  providerCost: Prisma.Decimal | string | number | null;
  platformMarkup: Prisma.Decimal | string | number | null;
  totalRevenue: Prisma.Decimal | string | number | null;
  requests: bigint | number;
};

const formatGroupedRevenueRow = (row: {
  _count: { _all: number };
  _sum: {
    providerCost: Prisma.Decimal | null;
    platformMarkup: Prisma.Decimal | null;
    totalCost: Prisma.Decimal | null;
  };
}) => ({
  requests: row._count._all,
  providerCost: formatDecimalValue(row._sum.providerCost) ?? "0",
  platformMarkup: formatDecimalValue(row._sum.platformMarkup) ?? "0",
  totalRevenue: formatDecimalValue(row._sum.totalCost) ?? "0",
});

export const getAdminRevenueSummaryService = async (
  _actor: AdminRevenueActor,
  query: AdminRevenueSummaryQuery
) => {
  const { where, meta, dateRange } = buildRevenueWhere(query);

  const [aggregate, totalRequests] = await Promise.all([
    prisma.inferenceRequest.aggregate({
      where,
      _sum: {
        providerCost: true,
        platformMarkup: true,
        totalCost: true,
      },
      _avg: {
        platformMarkupPercent: true,
      },
    }),
    prisma.inferenceRequest.count({ where }),
  ]);

  return {
    range: dateRange,
    totals: {
      totalRequests,
      providerCost: formatDecimalValue(aggregate._sum.providerCost) ?? "0",
      platformMarkup: formatDecimalValue(aggregate._sum.platformMarkup) ?? "0",
      totalRevenue: formatDecimalValue(aggregate._sum.totalCost) ?? "0",
      averageMarkupPercent: aggregate._avg.platformMarkupPercent
        ? Number(aggregate._avg.platformMarkupPercent.toFixed(2))
        : 0,
    },
    ...(meta ? { meta } : {}),
  };
};

export const getAdminRevenueTimeseriesService = async (
  _actor: AdminRevenueActor,
  query: AdminRevenueTimeseriesQuery
) => {
  buildRevenueQuery(query);
  const { meta, dateRange } = buildRevenueWhere(query);
  const granularity = getTimeseriesGranularity(query, dateRange.from, dateRange.to);
  const bucketExpression = getBucketExpression(granularity);
  const conditions: Prisma.Sql[] = [];

  appendCondition(conditions, query.userId ? Prisma.sql`ir."user_id" = ${query.userId}` : null);
  appendCondition(
    conditions,
    query.projectId ? Prisma.sql`ir."project_id" = ${query.projectId}` : null
  );
  appendCondition(
    conditions,
    query.apiKeyId ? Prisma.sql`ir."api_key_id" = ${query.apiKeyId}` : null
  );
  appendCondition(conditions, query.modelId ? Prisma.sql`ir."model_id" = ${query.modelId}` : null);
  appendCondition(
    conditions,
    query.providerId ? Prisma.sql`m."provider_id" = ${query.providerId}` : null
  );
  appendCondition(conditions, query.status ? Prisma.sql`ir."status" = ${query.status}` : null);
  appendCondition(
    conditions,
    query.requestType ? Prisma.sql`ir."requestType" = ${query.requestType}` : null
  );
  appendCondition(
    conditions,
    typeof query.stream === "boolean" ? Prisma.sql`ir."stream" = ${query.stream}` : null
  );
  appendCondition(conditions, dateRange.from ? Prisma.sql`ir."created_at" >= ${dateRange.from}` : null);
  appendCondition(conditions, dateRange.to ? Prisma.sql`ir."created_at" <= ${dateRange.to}` : null);

  if (query.search) {
    const likeValue = `%${query.search.toLowerCase()}%`;
    const prefixValue = `${query.search.toLowerCase()}%`;

    appendCondition(
      conditions,
      Prisma.sql`(
        LOWER(COALESCE(ir."requested_model_slug", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(ir."resolved_model_slug", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(u."email", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(u."first_name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(u."last_name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(ak."name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(ak."key_prefix", '')) LIKE ${prefixValue}
        OR LOWER(COALESCE(p."name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(m."display_name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(pr."display_name", '')) LIKE ${likeValue}
      )`
    );
  }

  const rows = await prisma.$queryRaw<RevenueTimeseriesRow[]>(Prisma.sql`
    SELECT
      ${bucketExpression} AS "bucket",
      COUNT(*) AS "requests",
      COALESCE(SUM(ir."provider_cost"), 0) AS "providerCost",
      COALESCE(SUM(ir."platform_markup"), 0) AS "platformMarkup",
      COALESCE(SUM(ir."total_cost"), 0) AS "totalRevenue"
    FROM "inference_requests" ir
    INNER JOIN "users" u ON u."id" = ir."user_id"
    INNER JOIN "api_keys" ak ON ak."id" = ir."api_key_id"
    INNER JOIN "projects" p ON p."id" = ir."project_id"
    INNER JOIN "models" m ON m."id" = ir."model_id"
    INNER JOIN "providers" pr ON pr."id" = m."provider_id"
    WHERE ${conditions.length ? Prisma.join(conditions, " AND ") : Prisma.sql`1 = 1`}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  return {
    range: dateRange,
    granularity,
    series: rows.map((row) => ({
      bucket: row.bucket,
      requests: Number(row.requests ?? 0),
      providerCost: formatDecimalValue(row.providerCost) ?? "0",
      platformMarkup: formatDecimalValue(row.platformMarkup) ?? "0",
      totalRevenue: formatDecimalValue(row.totalRevenue) ?? "0",
    })),
    ...(meta ? { meta } : {}),
  };
};

export const getAdminRevenueByUsersService = async (
  _actor: AdminRevenueActor,
  query: AdminRevenueByUsersQuery
) => {
  const { where, meta, dateRange } = buildRevenueWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
      _sum: {
        providerCost: true,
        platformMarkup: true,
        totalCost: true,
      },
      orderBy: [{ _sum: { totalCost: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
  ]);

  const users = groups.length
    ? await prisma.user.findMany({
        where: {
          id: { in: groups.map((item) => item.userId) },
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          status: true,
        },
      })
    : [];

  const userMap = new Map(users.map((user) => [user.id, user]));

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        userId: item.userId,
        email: userMap.get(item.userId)?.email ?? null,
        firstName: userMap.get(item.userId)?.firstName ?? null,
        lastName: userMap.get(item.userId)?.lastName ?? null,
        status: userMap.get(item.userId)?.status ?? null,
        ...formatGroupedRevenueRow(item),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminRevenueByModelsService = async (
  _actor: AdminRevenueActor,
  query: AdminRevenueByModelsQuery
) => {
  const { where, meta, dateRange } = buildRevenueWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["modelId"],
      where,
      _count: { _all: true },
      _sum: {
        providerCost: true,
        platformMarkup: true,
        totalCost: true,
      },
      orderBy: [{ _sum: { totalCost: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["modelId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
  ]);

  const models = groups.length
    ? await prisma.model.findMany({
        where: { id: { in: groups.map((item) => item.modelId) } },
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
    : [];

  const modelMap = new Map(models.map((model) => [model.id, model]));

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        modelId: item.modelId,
        slug: modelMap.get(item.modelId)?.slug ?? null,
        displayName: modelMap.get(item.modelId)?.displayName ?? null,
        provider: modelMap.get(item.modelId)?.provider ?? null,
        ...formatGroupedRevenueRow(item),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminRevenueByProvidersService = async (
  _actor: AdminRevenueActor,
  query: AdminRevenueByProvidersQuery
) => {
  const { where, meta, dateRange } = buildRevenueWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const groups = await prisma.inferenceRequest.groupBy({
    by: ["modelId"],
    where,
    _count: { _all: true },
    _sum: {
      providerCost: true,
      platformMarkup: true,
      totalCost: true,
    },
    orderBy: [{ _sum: { totalCost: "desc" } }],
  });

  const pagedGroups = groups.slice(skip, skip + take);
  const models = pagedGroups.length
    ? await prisma.model.findMany({
        where: { id: { in: pagedGroups.map((item) => item.modelId) } },
        select: {
          id: true,
          provider: {
            select: {
              id: true,
              slug: true,
              displayName: true,
            },
          },
        },
      })
    : [];

  const modelToProviderMap = new Map(models.map((model) => [model.id, model.provider]));
  const providerAggregation = new Map<
    string,
    {
      provider: { id: string; slug: string | null; displayName: string | null };
      requests: number;
      providerCost: Prisma.Decimal;
      platformMarkup: Prisma.Decimal;
      totalRevenue: Prisma.Decimal;
    }
  >();

  for (const item of groups) {
    const provider = modelToProviderMap.get(item.modelId)
      ?? (
        await prisma.model.findUnique({
          where: { id: item.modelId },
          select: {
            provider: {
              select: {
                id: true,
                slug: true,
                displayName: true,
              },
            },
          },
        })
      )?.provider;

    if (!provider) {
      continue;
    }

    const current = providerAggregation.get(provider.id) ?? {
      provider,
      requests: 0,
      providerCost: new Prisma.Decimal(0),
      platformMarkup: new Prisma.Decimal(0),
      totalRevenue: new Prisma.Decimal(0),
    };

    providerAggregation.set(provider.id, {
      provider,
      requests: current.requests + item._count._all,
      providerCost: current.providerCost.add(item._sum.providerCost ?? 0),
      platformMarkup: current.platformMarkup.add(item._sum.platformMarkup ?? 0),
      totalRevenue: current.totalRevenue.add(item._sum.totalCost ?? 0),
    });
  }

  const rows = Array.from(providerAggregation.values())
    .sort((a, b) => Number(b.totalRevenue.minus(a.totalRevenue).toString()))
    .slice(skip, skip + take);

  return {
    ...formatPaginationResponse(
      rows.map((item) => ({
        providerId: item.provider.id,
        provider: item.provider,
        requests: item.requests,
        providerCost: formatDecimalValue(item.providerCost) ?? "0",
        platformMarkup: formatDecimalValue(item.platformMarkup) ?? "0",
        totalRevenue: formatDecimalValue(item.totalRevenue) ?? "0",
      })),
      providerAggregation.size,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminRevenueByProjectsService = async (
  _actor: AdminRevenueActor,
  query: AdminRevenueByProjectsQuery
) => {
  const { where, meta, dateRange } = buildRevenueWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["projectId"],
      where,
      _count: { _all: true },
      _sum: {
        providerCost: true,
        platformMarkup: true,
        totalCost: true,
      },
      orderBy: [{ _sum: { totalCost: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["projectId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
  ]);

  const projects = groups.length
    ? await prisma.project.findMany({
        where: { id: { in: groups.map((item) => item.projectId) } },
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
    : [];

  const projectMap = new Map(projects.map((project) => [project.id, project]));

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        projectId: item.projectId,
        name: projectMap.get(item.projectId)?.name ?? null,
        slug: projectMap.get(item.projectId)?.slug ?? null,
        isActive: projectMap.get(item.projectId)?.isActive ?? false,
        user: projectMap.get(item.projectId)?.user ?? null,
        ...formatGroupedRevenueRow(item),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminRevenueByApiKeysService = async (
  _actor: AdminRevenueActor,
  query: AdminRevenueByApiKeysQuery
) => {
  const { where, meta, dateRange } = buildRevenueWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["apiKeyId"],
      where,
      _count: { _all: true },
      _sum: {
        providerCost: true,
        platformMarkup: true,
        totalCost: true,
      },
      orderBy: [{ _sum: { totalCost: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["apiKeyId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
  ]);

  const apiKeys = groups.length
    ? await prisma.apiKey.findMany({
        where: { id: { in: groups.map((item) => item.apiKeyId) } },
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
    : [];

  const apiKeyMap = new Map(apiKeys.map((apiKey) => [apiKey.id, apiKey]));

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        apiKeyId: item.apiKeyId,
        name: apiKeyMap.get(item.apiKeyId)?.name ?? null,
        keyPrefix: apiKeyMap.get(item.apiKeyId)?.keyPrefix ?? null,
        status: apiKeyMap.get(item.apiKeyId)?.status ?? null,
        project: apiKeyMap.get(item.apiKeyId)?.project ?? null,
        user: apiKeyMap.get(item.apiKeyId)?.user ?? null,
        ...formatGroupedRevenueRow(item),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};
