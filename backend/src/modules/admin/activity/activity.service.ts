import { Prisma, RequestStatus, RequestType } from "@prisma/client";
import { QueryBuilderError, buildPrismaQuery } from "prisma-qb";

import prisma from "../../../../prisma.js";
import AppError from "../../../shared/errors/index.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../../utils/paginationUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type {
  AdminActivityActor,
  AdminActivityByApiKeysQuery,
  AdminActivityByModelsQuery,
  AdminActivityByProjectsQuery,
  AdminActivityByProvidersQuery,
  AdminActivityByUsersQuery,
} from "./activity.types.js";

type AdminActivityQuery =
  | AdminActivityByUsersQuery
  | AdminActivityByModelsQuery
  | AdminActivityByProvidersQuery
  | AdminActivityByProjectsQuery
  | AdminActivityByApiKeysQuery;

type StatusCountMap = Record<RequestStatus, number>;

const createEmptyStatusCountMap = (): StatusCountMap => ({
  [RequestStatus.SUCCESS]: 0,
  [RequestStatus.FAILED]: 0,
  [RequestStatus.STOPPED]: 0,
  [RequestStatus.PENDING]: 0,
  [RequestStatus.PARTIAL]: 0,
});

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

const formatAverageValue = (value: number | null | undefined) =>
  value === null || value === undefined ? null : Number(value.toFixed(2));

const getGroupedRequestCount = (row: {
  _count?: true | { _all?: number | null } | null;
}) => (typeof row._count === "object" && row._count ? (row._count._all ?? 0) : 0);

const getGroupedNumericSum = (
  row: {
    _sum?: {
      promptTokens?: number | null;
      completionTokens?: number | null;
      totalTokens?: number | null;
    } | null;
  },
  key: "promptTokens" | "completionTokens" | "totalTokens"
) => row._sum?.[key] ?? null;

const getGroupedDecimalSum = (row: {
  _sum?: {
    totalCost?: Prisma.Decimal | null;
  } | null;
}) => row._sum?.totalCost ?? null;

const getGroupedAverage = (
  row: {
    _avg?: {
      latencyMs?: number | null;
      responseCompletionTimeMs?: number | null;
    } | null;
  },
  key: "latencyMs" | "responseCompletionTimeMs"
) => row._avg?.[key] ?? null;

const getGroupedDate = (
  row: {
    _min?: { createdAt?: Date | null } | null;
    _max?: { createdAt?: Date | null } | null;
  },
  key: "_min" | "_max"
) => row[key]?.createdAt ?? null;

const getDefaultDateRange = (preset?: AdminActivityByUsersQuery["dateRangePreset"]) => {
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

const getDateRange = (query: AdminActivityQuery) => {
  if (query.from || query.to) {
    return {
      from: query.from,
      to: query.to,
      preset: query.dateRangePreset ?? "custom",
    };
  }

  return getDefaultDateRange(query.dateRangePreset);
};

const hasAndConditions = (
  where: Prisma.InferenceRequestWhereInput
): where is { AND: Prisma.InferenceRequestWhereInput[] } =>
  "AND" in where && Array.isArray(where.AND);

const buildActivityQuery = (query: AdminActivityQuery) => {
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
        {
          key: "status",
          field: "status",
          type: "enum",
          enumValues: Object.values(RequestStatus),
        },
        {
          key: "requestType",
          field: "requestType",
          type: "enum",
          enumValues: Object.values(RequestType),
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
      ],
      defaultSort: { key: "createdAt", order: "desc" },
      strict: true,
      allowedQueryKeys: [
        "page",
        "pageSize",
        "dateRangePreset",
        "from",
        "to",
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

const buildActivityWhere = (query: AdminActivityQuery) => {
  const qbQuery = buildActivityQuery(query);
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

const formatGroupedActivityMetrics = (
  row: {
    _count?: true | { _all?: number | null } | null;
    _sum?: {
      promptTokens?: number | null;
      completionTokens?: number | null;
      totalTokens?: number | null;
      totalCost?: Prisma.Decimal | null;
    } | null;
    _avg?: {
      latencyMs?: number | null;
      responseCompletionTimeMs?: number | null;
    } | null;
    _min?: { createdAt?: Date | null } | null;
    _max?: { createdAt?: Date | null } | null;
  },
  statuses: StatusCountMap
) => ({
  requests: getGroupedRequestCount(row),
  successRequests: statuses.SUCCESS,
  failedRequests: statuses.FAILED,
  stoppedRequests: statuses.STOPPED,
  pendingRequests: statuses.PENDING,
  partialRequests: statuses.PARTIAL,
  promptTokens: getGroupedNumericSum(row, "promptTokens") ?? 0,
  completionTokens: getGroupedNumericSum(row, "completionTokens") ?? 0,
  totalTokens: getGroupedNumericSum(row, "totalTokens") ?? 0,
  totalCost: formatDecimalValue(getGroupedDecimalSum(row)) ?? "0",
  averageLatencyMs: formatAverageValue(getGroupedAverage(row, "latencyMs")),
  averageResponseCompletionTimeMs: formatAverageValue(
    getGroupedAverage(row, "responseCompletionTimeMs")
  ),
  firstActivityAt: getGroupedDate(row, "_min"),
  lastActivityAt: getGroupedDate(row, "_max"),
});

const buildStatusMapByField = <
  T extends {
    status: RequestStatus | null;
    _count: { _all: number };
  } & Record<TKey, string>,
  TKey extends string,
>(
  rows: T[],
  key: TKey
) => {
  const result = new Map<string, StatusCountMap>();

  for (const row of rows) {
    const id = row[key];
    const current = result.get(id) ?? createEmptyStatusCountMap();

    if (row.status) {
      current[row.status] = row._count._all;
    }

    result.set(id, current);
  }

  return result;
};

const getStatusCountsForId = (map: Map<string, StatusCountMap>, id: string) =>
  map.get(id) ?? createEmptyStatusCountMap();

export const getAdminActivityByUsersService = async (
  _actor: AdminActivityActor,
  query: AdminActivityByUsersQuery
) => {
  const { where, meta, dateRange } = buildActivityWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords, statusGroups] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
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
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { userId: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
    prisma.inferenceRequest.groupBy({
      by: ["userId", "status"],
      where,
      _count: { _all: true },
    }),
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
  const statusMap = buildStatusMapByField(statusGroups, "userId");

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        userId: item.userId,
        email: userMap.get(item.userId)?.email ?? null,
        firstName: userMap.get(item.userId)?.firstName ?? null,
        lastName: userMap.get(item.userId)?.lastName ?? null,
        status: userMap.get(item.userId)?.status ?? null,
        ...formatGroupedActivityMetrics(item, getStatusCountsForId(statusMap, item.userId)),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminActivityByModelsService = async (
  _actor: AdminActivityActor,
  query: AdminActivityByModelsQuery
) => {
  const { where, meta, dateRange } = buildActivityWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords, statusGroups] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["modelId"],
      where,
      _count: { _all: true },
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
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { modelId: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["modelId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
    prisma.inferenceRequest.groupBy({
      by: ["modelId", "status"],
      where,
      _count: { _all: true },
    }),
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
  const statusMap = buildStatusMapByField(statusGroups, "modelId");

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        modelId: item.modelId,
        slug: modelMap.get(item.modelId)?.slug ?? null,
        displayName: modelMap.get(item.modelId)?.displayName ?? null,
        provider: modelMap.get(item.modelId)?.provider ?? null,
        ...formatGroupedActivityMetrics(item, getStatusCountsForId(statusMap, item.modelId)),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminActivityByProvidersService = async (
  _actor: AdminActivityActor,
  query: AdminActivityByProvidersQuery
) => {
  const { where, meta, dateRange } = buildActivityWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [modelGroups, modelStatusGroups] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["modelId"],
      where,
      _count: { _all: true },
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
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { modelId: "desc" } }],
    }),
    prisma.inferenceRequest.groupBy({
      by: ["modelId", "status"],
      where,
      _count: { _all: true },
    }),
  ]);

  const models = modelGroups.length
    ? await prisma.model.findMany({
        where: { id: { in: modelGroups.map((item) => item.modelId) } },
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

  const modelMap = new Map(models.map((model) => [model.id, model]));
  const statusMap = buildStatusMapByField(modelStatusGroups, "modelId");
  const providerAggregation = new Map<
    string,
    {
      provider: { id: string; slug: string | null; displayName: string | null };
      requests: number;
      successRequests: number;
      failedRequests: number;
      stoppedRequests: number;
      pendingRequests: number;
      partialRequests: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      totalCost: Prisma.Decimal;
      latencyTotal: number;
      latencyCount: number;
      responseCompletionTimeTotal: number;
      responseCompletionTimeCount: number;
      firstActivityAt: Date | null;
      lastActivityAt: Date | null;
    }
  >();

  for (const item of modelGroups) {
    const model = modelMap.get(item.modelId);
    const provider = model?.provider;

    if (!provider) {
      continue;
    }

    const current = providerAggregation.get(provider.id) ?? {
      provider,
      requests: 0,
      successRequests: 0,
      failedRequests: 0,
      stoppedRequests: 0,
      pendingRequests: 0,
      partialRequests: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      totalCost: new Prisma.Decimal(0),
      latencyTotal: 0,
      latencyCount: 0,
      responseCompletionTimeTotal: 0,
      responseCompletionTimeCount: 0,
      firstActivityAt: null,
      lastActivityAt: null,
    };

    const statuses = getStatusCountsForId(statusMap, item.modelId);

    providerAggregation.set(provider.id, {
      provider,
      requests: current.requests + getGroupedRequestCount(item),
      successRequests: current.successRequests + statuses.SUCCESS,
      failedRequests: current.failedRequests + statuses.FAILED,
      stoppedRequests: current.stoppedRequests + statuses.STOPPED,
      pendingRequests: current.pendingRequests + statuses.PENDING,
      partialRequests: current.partialRequests + statuses.PARTIAL,
      promptTokens: current.promptTokens + (getGroupedNumericSum(item, "promptTokens") ?? 0),
      completionTokens:
        current.completionTokens + (getGroupedNumericSum(item, "completionTokens") ?? 0),
      totalTokens: current.totalTokens + (getGroupedNumericSum(item, "totalTokens") ?? 0),
      totalCost: current.totalCost.add(getGroupedDecimalSum(item) ?? 0),
      latencyTotal:
        current.latencyTotal
        + (getGroupedAverage(item, "latencyMs") ?? 0) * getGroupedRequestCount(item),
      latencyCount:
        current.latencyCount
        + (getGroupedAverage(item, "latencyMs") !== null ? getGroupedRequestCount(item) : 0),
      responseCompletionTimeTotal:
        current.responseCompletionTimeTotal
        + (getGroupedAverage(item, "responseCompletionTimeMs") ?? 0) * getGroupedRequestCount(item),
      responseCompletionTimeCount:
        current.responseCompletionTimeCount
        + (
            getGroupedAverage(item, "responseCompletionTimeMs") !== null
              ? getGroupedRequestCount(item)
              : 0
          ),
      firstActivityAt:
        current.firstActivityAt && getGroupedDate(item, "_min")
          ? current.firstActivityAt < (getGroupedDate(item, "_min") as Date)
            ? current.firstActivityAt
            : getGroupedDate(item, "_min")
          : (current.firstActivityAt ?? getGroupedDate(item, "_min")),
      lastActivityAt:
        current.lastActivityAt && getGroupedDate(item, "_max")
          ? current.lastActivityAt > (getGroupedDate(item, "_max") as Date)
            ? current.lastActivityAt
            : getGroupedDate(item, "_max")
          : (current.lastActivityAt ?? getGroupedDate(item, "_max")),
    });
  }

  const rows = Array.from(providerAggregation.values())
    .sort((a, b) => b.requests - a.requests)
    .slice(skip, skip + take);

  return {
    ...formatPaginationResponse(
      rows.map((item) => ({
        providerId: item.provider.id,
        provider: item.provider,
        requests: item.requests,
        successRequests: item.successRequests,
        failedRequests: item.failedRequests,
        stoppedRequests: item.stoppedRequests,
        pendingRequests: item.pendingRequests,
        partialRequests: item.partialRequests,
        promptTokens: item.promptTokens,
        completionTokens: item.completionTokens,
        totalTokens: item.totalTokens,
        totalCost: formatDecimalValue(item.totalCost) ?? "0",
        averageLatencyMs:
          item.latencyCount > 0 ? Number((item.latencyTotal / item.latencyCount).toFixed(2)) : null,
        averageResponseCompletionTimeMs:
          item.responseCompletionTimeCount > 0
            ? Number(
                (item.responseCompletionTimeTotal / item.responseCompletionTimeCount).toFixed(2)
              )
            : null,
        firstActivityAt: item.firstActivityAt,
        lastActivityAt: item.lastActivityAt,
      })),
      providerAggregation.size,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminActivityByProjectsService = async (
  _actor: AdminActivityActor,
  query: AdminActivityByProjectsQuery
) => {
  const { where, meta, dateRange } = buildActivityWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords, statusGroups] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["projectId"],
      where,
      _count: { _all: true },
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
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { projectId: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["projectId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
    prisma.inferenceRequest.groupBy({
      by: ["projectId", "status"],
      where,
      _count: { _all: true },
    }),
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
  const statusMap = buildStatusMapByField(statusGroups, "projectId");

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        projectId: item.projectId,
        name: projectMap.get(item.projectId)?.name ?? null,
        slug: projectMap.get(item.projectId)?.slug ?? null,
        isActive: projectMap.get(item.projectId)?.isActive ?? false,
        user: projectMap.get(item.projectId)?.user ?? null,
        ...formatGroupedActivityMetrics(item, getStatusCountsForId(statusMap, item.projectId)),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};

export const getAdminActivityByApiKeysService = async (
  _actor: AdminActivityActor,
  query: AdminActivityByApiKeysQuery
) => {
  const { where, meta, dateRange } = buildActivityWhere(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);

  const [groups, totalRecords, statusGroups] = await Promise.all([
    prisma.inferenceRequest.groupBy({
      by: ["apiKeyId"],
      where,
      _count: { _all: true },
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
      _min: { createdAt: true },
      _max: { createdAt: true },
      orderBy: [{ _count: { apiKeyId: "desc" } }],
      take,
      skip,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["apiKeyId"],
      where,
      _count: { _all: true },
    }).then((result) => result.length),
    prisma.inferenceRequest.groupBy({
      by: ["apiKeyId", "status"],
      where,
      _count: { _all: true },
    }),
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
  const statusMap = buildStatusMapByField(statusGroups, "apiKeyId");

  return {
    ...formatPaginationResponse(
      groups.map((item) => ({
        apiKeyId: item.apiKeyId,
        name: apiKeyMap.get(item.apiKeyId)?.name ?? null,
        keyPrefix: apiKeyMap.get(item.apiKeyId)?.keyPrefix ?? null,
        status: apiKeyMap.get(item.apiKeyId)?.status ?? null,
        project: apiKeyMap.get(item.apiKeyId)?.project ?? null,
        user: apiKeyMap.get(item.apiKeyId)?.user ?? null,
        ...formatGroupedActivityMetrics(item, getStatusCountsForId(statusMap, item.apiKeyId)),
      })),
      totalRecords,
      page,
      pageSize
    ),
    range: dateRange,
    ...(meta ? { meta } : {}),
  };
};
