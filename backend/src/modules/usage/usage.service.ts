import { Prisma, RequestStatus } from "@prisma/client";
import { QueryBuilderError, buildPrismaQuery } from "prisma-qb";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../utils/paginationUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type {
  GetUsageLogsQuery,
  GetUsageSummaryQuery,
  GetUsageTimeseriesQuery,
  UsageActor,
} from "./usage.types.js";

const ADMIN_ROLES = new Set(["Admin", "SuperAdmin"]);

const usageLogSelect = {
  id: true,
  userId: true,
  projectId: true,
  apiKeyId: true,
  modelId: true,
  requestType: true,
  requestedModelSlug: true,
  resolvedModelSlug: true,
  stream: true,
  status: true,
  responseCompletionTimeMs: true,
  promptTokens: true,
  completionTokens: true,
  totalTokens: true,
  totalCost: true,
  latencyMs: true,
  createdAt: true,
  apiKey: {
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      status: true,
    },
  },
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  },
  model: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      providerId: true,
      provider: {
        select: {
          id: true,
          slug: true,
          displayName: true,
          isActive: true,
        },
      },
    },
  },
} satisfies Prisma.InferenceRequestSelect;

const formatDecimalValue = (value: Prisma.Decimal | null) => {
  if (value === null) {
    return null;
  }

  const decimalPlaces = value.decimalPlaces();
  return value.toFixed(decimalPlaces);
};

const formatUsageLog = <
  T extends {
    totalCost: Prisma.Decimal | null;
  },
>(
  log: T
) => ({
  ...log,
  totalCost: formatDecimalValue(log.totalCost),
});

const isAdminActor = (actor: UsageActor) =>
  actor.roles.some((role) => ADMIN_ROLES.has(role));

const getEffectiveUserId = (
  actor: UsageActor,
  queryUserId?: string
) => {
  if (isAdminActor(actor)) {
    return queryUserId;
  }

  return actor.id;
};

const hasAndConditions = (
  where: Prisma.InferenceRequestWhereInput
): where is { AND: Prisma.InferenceRequestWhereInput[] } =>
  "AND" in where && Array.isArray(where.AND);

const buildDateRange = (
  query:
    | GetUsageLogsQuery
    | GetUsageSummaryQuery
    | GetUsageTimeseriesQuery
) => {
  if (query.from || query.to) {
    return {
      from: query.from,
      to: query.to,
    };
  }

  const now = new Date();
  const preset = query.dateRangePreset ?? "past_7d";

  switch (preset) {
    case "today": {
      const from = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0)
      );

      return { from, to: now };
    }
    case "past_24h":
      return {
        from: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        to: now,
      };
    case "past_30d":
      return {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        to: now,
      };
    case "past_1y":
      return {
        from: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        to: now,
      };
    case "custom":
      return {
        from: query.from,
        to: query.to,
      };
    case "past_7d":
    default:
      return {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: now,
      };
  }
};

const getTimeseriesGranularity = (
  query: GetUsageTimeseriesQuery,
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

const buildBaseUsageQuery = (
  query: GetUsageLogsQuery | GetUsageSummaryQuery | GetUsageTimeseriesQuery
) => {
  try {
    return buildPrismaQuery({
      query,
      searchFields: [
        { field: "requestedModelSlug" },
        { field: "resolvedModelSlug" },
        { field: "name", model: "apiKey" },
        { field: "keyPrefix", model: "apiKey", operator: "startsWith" },
        { field: "name", model: "project" },
        { field: "displayName", model: "model" },
        { field: "displayName", model: "model.provider" },
      ],
      filterFields: [
        { key: "projectId", field: "projectId", type: "string" },
        { key: "apiKeyId", field: "apiKeyId", type: "string" },
        { key: "modelId", field: "modelId", type: "string" },
        { key: "providerId", field: "providerId", model: "model", type: "string" },
        { key: "status", field: "status", type: "enum", enumValues: Object.values(RequestStatus) },
        {
          key: "requestType",
          field: "requestType",
          type: "enum",
          enumValues: ["CHAT", "STREAM", "IMAGE", "AUDIO", "VIDEO", "RESEARCH"],
        },
        { key: "stream", field: "stream", type: "boolean" },
      ],
      sortFields: [
        { key: "createdAt", field: "createdAt" },
        { key: "totalCost", field: "totalCost" },
        { key: "totalTokens", field: "totalTokens" },
        { key: "promptTokens", field: "promptTokens" },
        { key: "completionTokens", field: "completionTokens" },
        { key: "latencyMs", field: "latencyMs" },
        { key: "responseCompletionTimeMs", field: "responseCompletionTimeMs" },
        { key: "status", field: "status" },
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
      ],
    });
  } catch (error) {
    if (error instanceof QueryBuilderError) {
      throw new AppError(error.message, STATUS_CODES.BAD_REQUEST);
    }

    throw error;
  }
};

const buildUsageWhere = (
  actor: UsageActor,
  query: GetUsageLogsQuery | GetUsageSummaryQuery | GetUsageTimeseriesQuery
) => {
  const qbQuery = buildBaseUsageQuery(query);
  const dateRange = buildDateRange(query);
  const effectiveUserId = getEffectiveUserId(actor, query.userId);
  const andConditions: Prisma.InferenceRequestWhereInput[] = [];

  if (hasAndConditions(qbQuery.where)) {
    andConditions.push(...qbQuery.where.AND);
  }

  if (effectiveUserId) {
    andConditions.push({ userId: effectiveUserId });
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
    orderBy: qbQuery.orderBy,
    meta: qbQuery.meta,
    dateRange,
  };
};

const appendCondition = (conditions: Prisma.Sql[], condition: Prisma.Sql | null) => {
  if (condition) {
    conditions.push(condition);
  }
};

const buildTimeseriesWhereSql = (
  actor: UsageActor,
  query: GetUsageTimeseriesQuery,
  from?: Date,
  to?: Date
) => {
  const effectiveUserId = getEffectiveUserId(actor, query.userId);
  const conditions: Prisma.Sql[] = [];

  appendCondition(
    conditions,
    effectiveUserId ? Prisma.sql`ir."user_id" = ${effectiveUserId}` : null
  );
  appendCondition(
    conditions,
    query.projectId ? Prisma.sql`ir."project_id" = ${query.projectId}` : null
  );
  appendCondition(
    conditions,
    query.apiKeyId ? Prisma.sql`ir."api_key_id" = ${query.apiKeyId}` : null
  );
  appendCondition(
    conditions,
    query.modelId ? Prisma.sql`ir."model_id" = ${query.modelId}` : null
  );
  appendCondition(
    conditions,
    query.providerId ? Prisma.sql`m."provider_id" = ${query.providerId}` : null
  );
  appendCondition(
    conditions,
    query.status ? Prisma.sql`ir."status" = ${query.status}` : null
  );
  appendCondition(
    conditions,
    query.requestType ? Prisma.sql`ir."requestType" = ${query.requestType}` : null
  );
  appendCondition(
    conditions,
    typeof query.stream === "boolean" ? Prisma.sql`ir."stream" = ${query.stream}` : null
  );
  appendCondition(conditions, from ? Prisma.sql`ir."created_at" >= ${from}` : null);
  appendCondition(conditions, to ? Prisma.sql`ir."created_at" <= ${to}` : null);

  if (query.search) {
    const likeValue = `%${query.search.toLowerCase()}%`;
    const prefixValue = `${query.search.toLowerCase()}%`;

    appendCondition(
      conditions,
      Prisma.sql`(
        LOWER(COALESCE(ir."requested_model_slug", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(ir."resolved_model_slug", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(ak."name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(ak."key_prefix", '')) LIKE ${prefixValue}
        OR LOWER(COALESCE(p."name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(m."display_name", '')) LIKE ${likeValue}
        OR LOWER(COALESCE(pr."display_name", '')) LIKE ${likeValue}
      )`
    );
  }

  return conditions.length ? Prisma.join(conditions, " AND ") : Prisma.sql`1 = 1`;
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

export const getUsageLogsService = async (
  actor: UsageActor,
  query: GetUsageLogsQuery
) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);
  const { where, orderBy, meta } = buildUsageWhere(actor, query);

  const [logs, totalRecords] = await Promise.all([
    prisma.inferenceRequest.findMany({
      where,
      select: usageLogSelect,
      orderBy,
      take,
      skip,
    }),
    prisma.inferenceRequest.count({ where }),
  ]);

  return {
    ...formatPaginationResponse(
      logs.map((log) => formatUsageLog(log)),
      totalRecords,
      page,
      pageSize
    ),
    ...(meta ? { meta } : {}),
  };
};

export const getUsageSummaryService = async (
  actor: UsageActor,
  query: GetUsageSummaryQuery
) => {
  const { where, meta, dateRange } = buildUsageWhere(actor, query);
  const andConditions = hasAndConditions(where) ? where.AND : [];

  const [totalRequests, successRequests, failedRequests, stoppedRequests, pendingRequests, partialRequests, totals] =
    await Promise.all([
      prisma.inferenceRequest.count({ where }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: RequestStatus.SUCCESS }] },
      }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: RequestStatus.FAILED }] },
      }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: RequestStatus.STOPPED }] },
      }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: RequestStatus.PENDING }] },
      }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: RequestStatus.PARTIAL }] },
      }),
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
          responseCompletionTimeMs: true,
        },
      }),
    ]);

  return {
    range: dateRange,
    totals: {
      totalRequests,
      successRequests,
      failedRequests,
      stoppedRequests,
      pendingRequests,
      partialRequests,
      promptTokens: totals._sum.promptTokens ?? 0,
      completionTokens: totals._sum.completionTokens ?? 0,
      totalTokens: totals._sum.totalTokens ?? 0,
      totalCost: formatDecimalValue(totals._sum.totalCost),
      averageLatencyMs: totals._avg.latencyMs ? Number(totals._avg.latencyMs.toFixed(2)) : 0,
      averageResponseCompletionTimeMs: totals._avg.responseCompletionTimeMs
        ? Number(totals._avg.responseCompletionTimeMs.toFixed(2))
        : 0,
    },
    ...(meta ? { meta } : {}),
  };
};

type TimeseriesRow = {
  bucket: Date;
  requests: bigint | number;
  promptTokens: bigint | number | null;
  completionTokens: bigint | number | null;
  totalTokens: bigint | number | null;
  totalCost: Prisma.Decimal | string | number | null;
};

export const getUsageTimeseriesService = async (
  actor: UsageActor,
  query: GetUsageTimeseriesQuery
) => {
  const { dateRange, meta } = buildUsageWhere(actor, query);
  const granularity = getTimeseriesGranularity(query, dateRange.from, dateRange.to);
  const whereSql = buildTimeseriesWhereSql(actor, query, dateRange.from, dateRange.to);
  const bucketExpression = getBucketExpression(granularity);

  const rows = await prisma.$queryRaw<TimeseriesRow[]>(Prisma.sql`
    SELECT
      ${bucketExpression} AS "bucket",
      COUNT(*) AS "requests",
      COALESCE(SUM(ir."prompt_tokens"), 0) AS "promptTokens",
      COALESCE(SUM(ir."completion_tokens"), 0) AS "completionTokens",
      COALESCE(SUM(ir."total_tokens"), 0) AS "totalTokens",
      COALESCE(SUM(ir."total_cost"), 0) AS "totalCost"
    FROM "inference_requests" ir
    INNER JOIN "api_keys" ak ON ak."id" = ir."api_key_id"
    INNER JOIN "projects" p ON p."id" = ir."project_id"
    INNER JOIN "models" m ON m."id" = ir."model_id"
    INNER JOIN "providers" pr ON pr."id" = m."provider_id"
    WHERE ${whereSql}
    GROUP BY 1
    ORDER BY 1 ASC
  `);

  return {
    range: dateRange,
    granularity,
    series: rows.map((row) => ({
      bucket: row.bucket,
      requests: Number(row.requests ?? 0),
      promptTokens: Number(row.promptTokens ?? 0),
      completionTokens: Number(row.completionTokens ?? 0),
      totalTokens: Number(row.totalTokens ?? 0),
      totalCost:
        row.totalCost instanceof Prisma.Decimal
          ? formatDecimalValue(row.totalCost)
          : row.totalCost?.toString() ?? "0",
    })),
    ...(meta ? { meta } : {}),
  };
};
