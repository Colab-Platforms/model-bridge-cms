import { ActivityType, ApiKeyStatus, Prisma, UserStatus } from "@prisma/client";
import { QueryBuilderError, buildPrismaQuery } from "prisma-qb";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { activityLogService } from "../../services/activity-log.service.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../utils/paginationUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type {
  AdminApiKeyStatusBody,
  AdminActivityLogsQuery,
  AdminActivitySummaryQuery,
  AdminActivityTimeseriesQuery,
  AdminActor,
  AdminModelBody,
  AdminModelUpdateBody,
  AdminModelsQuery,
  AdminOverviewQuery,
  AdminProviderBody,
  AdminProviderQuery,
  AdminProviderUpdateBody,
  AdminUserStatusBody,
  AdminUsersQuery,
} from "./admin.types.js";

const TOP_LIMIT = 5;

const adminUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phoneNo: true,
  countryCode: true,
  city: true,
  state: true,
  country: true,
  profileImage: true,
  status: true,
  authProvider: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  isDeleted: true,
  wallet: {
    select: {
      id: true,
      balance: true,
      currency: true,
      status: true,
    },
  },
  _count: {
    select: {
      projects: true,
      apiKeys: true,
      inferenceRequests: true,
    },
  },
} satisfies Prisma.UserSelect;

const adminUserProjectSelect = {
  id: true,
  userId: true,
  slug: true,
  name: true,
  description: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
} satisfies Prisma.ProjectSelect;

const adminUserApiKeySelect = {
  id: true,
  userId: true,
  projectId: true,
  name: true,
  keyPrefix: true,
  creditLimit: true,
  limitType: true,
  status: true,
  lastUsedAt: true,
  expiresAt: true,
  createdAt: true,
  updatedAt: true,
  project: {
    select: {
      id: true,
      name: true,
      slug: true,
      isActive: true,
    },
  },
} satisfies Prisma.ApiKeySelect;

const adminProviderSelect = {
  id: true,
  slug: true,
  displayName: true,
  description: true,
  baseUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProviderSelect;

const adminModelSelect = {
  id: true,
  providerId: true,
  slug: true,
  displayName: true,
  description: true,
  contextLength: true,
  maxOutputTokens: true,
  tokenizer: true,
  inputPricePerToken: true,
  outputPricePerToken: true,
  cacheWritePricePerToken: true,
  cacheReadPricePerToken: true,
  inputModalities: true,
  outputModalities: true,
  supportedParameters: true,
  defaultForCapabilities: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  provider: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      providerLogo: true,
      isActive: true,
    },
  },
} satisfies Prisma.ModelSelect;

const activityLogSelect = {
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
  providerCost: true,
  platformMarkupPercent: true,
  platformMarkup: true,
  totalCost: true,
  latencyMs: true,
  createdAt: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      status: true,
    },
  },
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

const formatRequestFinancials = <
  T extends {
    providerCost?: Prisma.Decimal | null;
    platformMarkupPercent?: Prisma.Decimal | null;
    platformMarkup?: Prisma.Decimal | null;
    totalCost?: Prisma.Decimal | null;
  },
>(
  row: T
) => ({
  ...row,
  providerCost: formatDecimalValue(row.providerCost) ?? "0",
  platformMarkupPercent: formatDecimalValue(row.platformMarkupPercent) ?? "0",
  platformMarkup: formatDecimalValue(row.platformMarkup) ?? "0",
  totalCost: formatDecimalValue(row.totalCost) ?? "0",
});

const getDefaultDateRange = (preset?: AdminOverviewQuery["dateRangePreset"]) => {
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
  query: AdminOverviewQuery | AdminActivitySummaryQuery | AdminActivityTimeseriesQuery
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
  query: AdminActivityTimeseriesQuery,
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

const appendCondition = (conditions: Prisma.Sql[], condition: Prisma.Sql | null) => {
  if (condition) {
    conditions.push(condition);
  }
};

const hasAndConditions = (
  where: Prisma.InferenceRequestWhereInput
): where is { AND: Prisma.InferenceRequestWhereInput[] } =>
  "AND" in where && Array.isArray(where.AND);

const buildAdminActivityQuery = (
  query:
    | AdminOverviewQuery
    | AdminActivityLogsQuery
    | AdminActivitySummaryQuery
    | AdminActivityTimeseriesQuery
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
        { key: "latencyMs", field: "latencyMs" },
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
        "projectId",
        "apiKeyId",
        "modelId",
        "providerId",
        "status",
        "requestType",
        "stream",
        "search",
        "sort",
      ],
    });
  } catch (error) {
    if (error instanceof QueryBuilderError) {
      throw new AppError(error.message, STATUS_CODES.BAD_REQUEST);
    }

    throw error;
  }
};

const buildAdminWhere = (
  query:
    | AdminOverviewQuery
    | AdminActivityLogsQuery
    | AdminActivitySummaryQuery
    | AdminActivityTimeseriesQuery
) => {
  const qbQuery = buildAdminActivityQuery(query);
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
    orderBy: qbQuery.orderBy,
    meta: qbQuery.meta,
    dateRange,
  };
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

const buildAdminUsersQuery = (query: AdminUsersQuery) => {
  try {
    return buildPrismaQuery({
      query,
      searchFields: [
        { field: "email" },
        { field: "firstName" },
        { field: "lastName" },
      ],
      filterFields: [
        { key: "status", field: "status", type: "enum" },
        { key: "isDeleted", field: "isDeleted", type: "boolean" },
      ],
      sortFields: [
        { key: "createdAt", field: "createdAt" },
        { key: "updatedAt", field: "updatedAt" },
        { key: "email", field: "email" },
        { key: "status", field: "status" },
      ],
      defaultSort: { key: "createdAt", order: "desc" },
      strict: true,
      allowedQueryKeys: ["search", "status", "isDeleted", "sort", "page", "pageSize"],
    });
  } catch (error) {
    if (error instanceof QueryBuilderError) {
      throw new AppError(error.message, STATUS_CODES.BAD_REQUEST);
    }

    throw error;
  }
};

const buildAdminProvidersQuery = (query: AdminProviderQuery): Prisma.ProviderWhereInput => ({
  isDeleted: false,
  ...(query.slug ? { slug: query.slug } : {}),
  ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
});

const buildAdminModelsQuery = (query: AdminModelsQuery): Prisma.ModelWhereInput => ({
  isDeleted: false,
  ...(query.providerId ? { providerId: query.providerId } : {}),
  ...(query.slug ? { slug: query.slug } : {}),
  ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
});

const getAdminUserOrThrow = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
    },
    select: adminUserSelect,
  });

  if (!user) {
    throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
  }

  return user;
};

const getAdminProviderOrThrow = async (providerId: string) => {
  const provider = await prisma.provider.findFirst({
    where: {
      id: providerId,
      isDeleted: false,
    },
    select: adminProviderSelect,
  });

  if (!provider) {
    throw new AppError("Provider not found", STATUS_CODES.NOT_FOUND);
  }

  return provider;
};

const getAdminModelOrThrow = async (modelId: string) => {
  const model = await prisma.model.findFirst({
    where: {
      id: modelId,
      isDeleted: false,
    },
    select: adminModelSelect,
  });

  if (!model) {
    throw new AppError("Model not found", STATUS_CODES.NOT_FOUND);
  }

  return model;
};

const getAdminApiKeyOrThrow = async (apiKeyId: string) => {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id: apiKeyId,
    },
    select: adminUserApiKeySelect,
  });

  if (!apiKey) {
    throw new AppError("API key not found", STATUS_CODES.NOT_FOUND);
  }

  return apiKey;
};

type TimeseriesRow = {
  bucket: Date;
  requests: bigint | number;
  totalTokens: bigint | number | null;
  providerCost: Prisma.Decimal | string | number | null;
  platformMarkup: Prisma.Decimal | string | number | null;
  totalCost: Prisma.Decimal | string | number | null;
};

export const getAdminUsersService = async (_actor: AdminActor, query: AdminUsersQuery) => {
  const qbQuery = buildAdminUsersQuery(query);
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);
  const where: Prisma.UserWhereInput = {
    ...(qbQuery.where as Prisma.UserWhereInput),
    ...(query.isDeleted === undefined ? { isDeleted: false } : {}),
  };

  const [users, totalRecords] = await Promise.all([
    prisma.user.findMany({
      where,
      select: adminUserSelect,
      orderBy: qbQuery.orderBy,
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  return {
    ...formatPaginationResponse(users, totalRecords, page, pageSize),
    ...(qbQuery.meta ? { meta: qbQuery.meta } : {}),
  };
};

export const getAdminUserByIdService = async (_actor: AdminActor, userId: string) =>
  getAdminUserOrThrow(userId);

export const updateAdminUserStatusService = async (
  actor: AdminActor,
  userId: string,
  body: AdminUserStatusBody
) => {
  const existingUser = await getAdminUserOrThrow(userId);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        status: body.status,
      },
      select: adminUserSelect,
    });

    if (body.status === UserStatus.SUSPENDED) {
      await tx.apiKey.updateMany({
        where: {
          userId,
          isDeleted: false,
          status: ApiKeyStatus.ACTIVE,
        },
        data: {
          status: ApiKeyStatus.INACTIVE,
        },
      });

      await activityLogService.log(
        {
          activityType: ActivityType.USER_SUSPENDED,
          entityType: "USER",
          entityId: user.id,
          actorId: actor.id,
          userId: user.id,
          metadata: {
            beforeStatus: existingUser.status,
            afterStatus: user.status,
          },
        },
        tx
      );
    }

    if (body.status === UserStatus.ACTIVE) {
      await activityLogService.log(
        {
          activityType: ActivityType.USER_ACTIVATED,
          entityType: "USER",
          entityId: user.id,
          actorId: actor.id,
          userId: user.id,
          metadata: {
            beforeStatus: existingUser.status,
            afterStatus: user.status,
          },
        },
        tx
      );
    }

    return user;
  });

  return updatedUser;
};

export const deleteAdminUserService = async (actor: AdminActor, userId: string) => {
  await getAdminUserOrThrow(userId);

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: {
        isDeleted: true,
        status: UserStatus.INACTIVE,
      },
      select: adminUserSelect,
    });

    await tx.apiKey.updateMany({
      where: {
        userId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        status: ApiKeyStatus.REVOKED,
      },
    });

    await tx.project.updateMany({
      where: {
        userId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        isActive: false,
        deletedBy: actor.id,
        updatedBy: actor.id,
      },
    });

    return user;
  });
};

export const getAdminUserProjectsService = async (_actor: AdminActor, userId: string) => {
  await getAdminUserOrThrow(userId);

  return prisma.project.findMany({
    where: {
      userId,
    },
    select: adminUserProjectSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getAdminUserApiKeysService = async (_actor: AdminActor, userId: string) => {
  await getAdminUserOrThrow(userId);

  return prisma.apiKey.findMany({
    where: {
      userId,
    },
    select: adminUserApiKeySelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getAdminApiKeyByIdService = async (_actor: AdminActor, apiKeyId: string) =>
  getAdminApiKeyOrThrow(apiKeyId);

export const getAdminProvidersService = async (_actor: AdminActor, query: AdminProviderQuery) =>
  prisma.provider.findMany({
    where: buildAdminProvidersQuery(query),
    select: adminProviderSelect,
    orderBy: { createdAt: "desc" },
  });

export const getAdminProviderByIdService = async (_actor: AdminActor, providerId: string) =>
  getAdminProviderOrThrow(providerId);

export const createAdminProviderService = async (actor: AdminActor, body: AdminProviderBody) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const provider = await tx.provider.create({
        data: {
          slug: body.slug,
          displayName: body.displayName,
          description: body.description,
          baseUrl: body.baseUrl,
          isActive: body.isActive ?? true,
        },
        select: adminProviderSelect,
      });

      await activityLogService.log(
        {
          activityType: provider.isActive
            ? ActivityType.PROVIDER_ENABLED
            : ActivityType.PROVIDER_DISABLED,
          entityType: "PROVIDER",
          entityId: provider.id,
          actorId: actor.id,
          metadata: {
            action: "created",
            slug: provider.slug,
            displayName: provider.displayName,
            isActive: provider.isActive,
          },
        },
        tx
      );

      return provider;
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new AppError("Provider slug already exists", STATUS_CODES.CONFLICT);
    }

    throw error;
  }
};

export const updateAdminProviderService = async (
  actor: AdminActor,
  providerId: string,
  body: AdminProviderUpdateBody
) => {
  const existingProvider = await getAdminProviderOrThrow(providerId);

  try {
    return await prisma.$transaction(async (tx) => {
      const provider = await tx.provider.update({
        where: { id: providerId },
        data: {
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.baseUrl !== undefined ? { baseUrl: body.baseUrl } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
        select: adminProviderSelect,
      });

      await activityLogService.log(
        {
          activityType: provider.isActive
            ? ActivityType.PROVIDER_ENABLED
            : ActivityType.PROVIDER_DISABLED,
          entityType: "PROVIDER",
          entityId: provider.id,
          actorId: actor.id,
          metadata: {
            action: "updated",
            before: existingProvider,
            after: provider,
          },
        },
        tx
      );

      return provider;
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new AppError("Provider slug already exists", STATUS_CODES.CONFLICT);
    }

    throw error;
  }
};

export const deleteAdminProviderService = async (actor: AdminActor, providerId: string) => {
  const existingProvider = await getAdminProviderOrThrow(providerId);

  return prisma.$transaction(async (tx) => {
    const provider = await tx.provider.update({
      where: { id: providerId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
      select: adminProviderSelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROVIDER_DISABLED,
        entityType: "PROVIDER",
        entityId: provider.id,
        actorId: actor.id,
        metadata: {
          action: "deleted",
          before: existingProvider,
        },
      },
      tx
    );

    return provider;
  });
};

export const getAdminModelsService = async (_actor: AdminActor, query: AdminModelsQuery) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 10);
  const where = buildAdminModelsQuery(query);

  const [models, totalRecords] = await Promise.all([
    prisma.model.findMany({
      where,
      select: adminModelSelect,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.model.count({ where }),
  ]);

  return formatPaginationResponse(
    models.map((model) => ({
      ...model,
      inputPricePerToken: formatDecimalValue(model.inputPricePerToken),
      outputPricePerToken: formatDecimalValue(model.outputPricePerToken),
      cacheWritePricePerToken: formatDecimalValue(model.cacheWritePricePerToken),
      cacheReadPricePerToken: formatDecimalValue(model.cacheReadPricePerToken),
    })),
    totalRecords,
    page,
    pageSize
  );
};

export const getAdminModelByIdService = async (_actor: AdminActor, modelId: string) => {
  const model = await getAdminModelOrThrow(modelId);

  return {
    ...model,
    inputPricePerToken: formatDecimalValue(model.inputPricePerToken),
    outputPricePerToken: formatDecimalValue(model.outputPricePerToken),
    cacheWritePricePerToken: formatDecimalValue(model.cacheWritePricePerToken),
    cacheReadPricePerToken: formatDecimalValue(model.cacheReadPricePerToken),
  };
};

export const createAdminModelService = async (actor: AdminActor, body: AdminModelBody) => {
  try {
    return await prisma.$transaction(async (tx) => {
      const model = await tx.model.create({
        data: {
          providerId: body.providerId,
          slug: body.slug,
          displayName: body.displayName,
          description: body.description,
          contextLength: body.contextLength,
          maxOutputTokens: body.maxOutputTokens,
          tokenizer: body.tokenizer,
          inputPricePerToken: body.inputPricePerToken,
          outputPricePerToken: body.outputPricePerToken,
          cacheWritePricePerToken: body.cacheWritePricePerToken,
          cacheReadPricePerToken: body.cacheReadPricePerToken,
          inputModalities: body.inputModalities ?? ["text"],
          outputModalities: body.outputModalities ?? ["text"],
          supportedParameters: body.supportedParameters ?? [],
          defaultForCapabilities: body.defaultForCapabilities ?? [],
          isActive: body.isActive ?? true,
        },
        select: adminModelSelect,
      });

      await activityLogService.log(
        {
          activityType: ActivityType.MODEL_CREATED,
          entityType: "MODEL",
          entityId: model.id,
          actorId: actor.id,
          metadata: {
            slug: model.slug,
            displayName: model.displayName,
            providerId: model.providerId,
            isActive: model.isActive,
          },
        },
        tx
      );

      return {
        ...model,
        inputPricePerToken: formatDecimalValue(model.inputPricePerToken),
        outputPricePerToken: formatDecimalValue(model.outputPricePerToken),
        cacheWritePricePerToken: formatDecimalValue(model.cacheWritePricePerToken),
        cacheReadPricePerToken: formatDecimalValue(model.cacheReadPricePerToken),
      };
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new AppError("Model slug already exists", STATUS_CODES.CONFLICT);
    }

    throw error;
  }
};

export const updateAdminModelService = async (
  actor: AdminActor,
  modelId: string,
  body: AdminModelUpdateBody
) => {
  const existingModel = await getAdminModelOrThrow(modelId);

  try {
    return await prisma.$transaction(async (tx) => {
      const model = await tx.model.update({
        where: { id: modelId },
        data: {
          ...(body.providerId !== undefined ? { providerId: body.providerId } : {}),
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.contextLength !== undefined ? { contextLength: body.contextLength } : {}),
          ...(body.maxOutputTokens !== undefined ? { maxOutputTokens: body.maxOutputTokens } : {}),
          ...(body.tokenizer !== undefined ? { tokenizer: body.tokenizer } : {}),
          ...(body.inputPricePerToken !== undefined
            ? { inputPricePerToken: body.inputPricePerToken }
            : {}),
          ...(body.outputPricePerToken !== undefined
            ? { outputPricePerToken: body.outputPricePerToken }
            : {}),
          ...(body.cacheWritePricePerToken !== undefined
            ? { cacheWritePricePerToken: body.cacheWritePricePerToken }
            : {}),
          ...(body.cacheReadPricePerToken !== undefined
            ? { cacheReadPricePerToken: body.cacheReadPricePerToken }
            : {}),
          ...(body.inputModalities !== undefined ? { inputModalities: body.inputModalities } : {}),
          ...(body.outputModalities !== undefined ? { outputModalities: body.outputModalities } : {}),
          ...(body.supportedParameters !== undefined
            ? { supportedParameters: body.supportedParameters }
            : {}),
          ...(body.defaultForCapabilities !== undefined
            ? { defaultForCapabilities: body.defaultForCapabilities }
            : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
        select: adminModelSelect,
      });

      await activityLogService.log(
        {
          activityType: model.isActive ? ActivityType.MODEL_UPDATED : ActivityType.MODEL_DISABLED,
          entityType: "MODEL",
          entityId: model.id,
          actorId: actor.id,
          metadata: {
            before: existingModel,
            after: model,
          },
        },
        tx
      );

      return {
        ...model,
        inputPricePerToken: formatDecimalValue(model.inputPricePerToken),
        outputPricePerToken: formatDecimalValue(model.outputPricePerToken),
        cacheWritePricePerToken: formatDecimalValue(model.cacheWritePricePerToken),
        cacheReadPricePerToken: formatDecimalValue(model.cacheReadPricePerToken),
      };
    });
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2002"
    ) {
      throw new AppError("Model slug already exists", STATUS_CODES.CONFLICT);
    }

    throw error;
  }
};

export const deleteAdminModelService = async (actor: AdminActor, modelId: string) => {
  const existingModel = await getAdminModelOrThrow(modelId);

  return prisma.$transaction(async (tx) => {
    const model = await tx.model.update({
      where: { id: modelId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
      select: adminModelSelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.MODEL_DISABLED,
        entityType: "MODEL",
        entityId: model.id,
        actorId: actor.id,
        metadata: {
          action: "deleted",
          before: existingModel,
        },
      },
      tx
    );

    return {
      ...model,
      inputPricePerToken: formatDecimalValue(model.inputPricePerToken),
      outputPricePerToken: formatDecimalValue(model.outputPricePerToken),
      cacheWritePricePerToken: formatDecimalValue(model.cacheWritePricePerToken),
      cacheReadPricePerToken: formatDecimalValue(model.cacheReadPricePerToken),
    };
  });
};

export const updateAdminApiKeyStatusService = async (
  actor: AdminActor,
  apiKeyId: string,
  body: AdminApiKeyStatusBody
) => {
  const existingApiKey = await getAdminApiKeyOrThrow(apiKeyId);

  return prisma.$transaction(async (tx) => {
    const apiKey = await tx.apiKey.update({
      where: { id: apiKeyId },
      data: {
        status: body.status,
      },
      select: adminUserApiKeySelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.API_KEY_UPDATED,
        entityType: "API_KEY",
        entityId: apiKey.id,
        actorId: actor.id,
        userId: apiKey.userId,
        projectId: apiKey.projectId,
        metadata: {
          beforeStatus: existingApiKey.status,
          afterStatus: apiKey.status,
          keyPrefix: apiKey.keyPrefix,
        },
      },
      tx
    );

    return apiKey;
  });
};

export const deleteAdminApiKeyService = async (actor: AdminActor, apiKeyId: string) => {
  const existingApiKey = await getAdminApiKeyOrThrow(apiKeyId);

  return prisma.$transaction(async (tx) => {
    const apiKey = await tx.apiKey.update({
      where: { id: apiKeyId },
      data: {
        isDeleted: true,
        status: ApiKeyStatus.REVOKED,
      },
      select: adminUserApiKeySelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.API_KEY_REVOKED,
        entityType: "API_KEY",
        entityId: apiKey.id,
        actorId: actor.id,
        userId: apiKey.userId,
        projectId: apiKey.projectId,
        metadata: {
          previousStatus: existingApiKey.status,
          keyPrefix: existingApiKey.keyPrefix,
          name: existingApiKey.name,
        },
      },
      tx
    );

    return apiKey;
  });
};

export const getAdminOverviewService = async (
  _actor: AdminActor,
  query: AdminOverviewQuery
) => {
  const { where, dateRange } = buildAdminWhere(query);

  const [
    usageAggregate,
    totalRequests,
    totalUsers,
    activeUsers,
    suspendedUsers,
    totalProjects,
    activeApiKeys,
    statusGroups,
    topUserGroups,
    topModelGroups,
    topProviderGroups,
  ] = await Promise.all([
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
        responseCompletionTimeMs: true,
      },
    }),
    prisma.inferenceRequest.count({ where }),
    prisma.user.count({ where: { isDeleted: false } }),
    prisma.user.count({ where: { isDeleted: false, status: UserStatus.ACTIVE } }),
    prisma.user.count({ where: { isDeleted: false, status: UserStatus.SUSPENDED } }),
    prisma.project.count({ where: { isDeleted: false } }),
    prisma.apiKey.count({ where: { isDeleted: false, status: "ACTIVE" } }),
    prisma.inferenceRequest.groupBy({
      by: ["status"],
      where,
      _count: { _all: true },
    }),
    prisma.inferenceRequest.groupBy({
      by: ["userId"],
      where,
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        totalCost: true,
        platformMarkup: true,
      },
      orderBy: [
        { _sum: { totalCost: "desc" } },
        { _count: { userId: "desc" } },
      ],
      take: TOP_LIMIT,
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
      ],
      take: TOP_LIMIT,
    }),
    prisma.inferenceRequest.groupBy({
      by: ["modelId"],
      where,
      _count: { _all: true },
      _sum: {
        totalTokens: true,
        totalCost: true,
      },
      orderBy: [{ _sum: { totalCost: "desc" } }],
      take: 100,
    }),
  ]);

  const [topUsers, models, providers] = await Promise.all([
    topUserGroups.length
      ? prisma.user.findMany({
          where: { id: { in: topUserGroups.map((item) => item.userId) } },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            status: true,
          },
        })
      : Promise.resolve([]),
    topModelGroups.length || topProviderGroups.length
      ? prisma.model.findMany({
          where: {
            id: {
              in: Array.from(new Set([...topModelGroups, ...topProviderGroups].map((item) => item.modelId))),
            },
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
    prisma.provider.findMany({
      where: { isDeleted: false },
      select: { id: true, slug: true, displayName: true },
    }),
  ]);

  const userMap = new Map(topUsers.map((item) => [item.id, item]));
  const modelMap = new Map(models.map((item) => [item.id, item]));
  const providerAggMap = new Map<
    string,
    { requests: number; totalTokens: number; totalCost: Prisma.Decimal | number | null }
  >();

  for (const group of topProviderGroups) {
    const model = modelMap.get(group.modelId);
    const providerId = model?.provider.id;

    if (!providerId) {
      continue;
    }

    const current = providerAggMap.get(providerId) ?? {
      requests: 0,
      totalTokens: 0,
      totalCost: 0,
    };

    const nextTotalCost =
      current.totalCost instanceof Prisma.Decimal
        ? current.totalCost
        : new Prisma.Decimal(current.totalCost ?? 0);

    providerAggMap.set(providerId, {
      requests: current.requests + getGroupedCount(group._count),
      totalTokens: current.totalTokens + Number(getGroupedSumValue(group._sum, "totalTokens") ?? 0),
      totalCost: nextTotalCost.add(
        getGroupedSumValue(group._sum, "totalCost") instanceof Prisma.Decimal
          ? (getGroupedSumValue(group._sum, "totalCost") as Prisma.Decimal)
          : new Prisma.Decimal(getGroupedSumValue(group._sum, "totalCost") ?? 0)
      ),
    });
  }

  const providerMap = new Map(providers.map((item) => [item.id, item]));
  const statusCounts = toCountMap(statusGroups, "status");
  const successRate =
    totalRequests > 0
      ? Number((((statusCounts.SUCCESS ?? 0) / totalRequests) * 100).toFixed(2))
      : 0;

  return {
    summary: {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalProjects,
      activeApiKeys,
      totalRequests,
      totalTokens: usageAggregate._sum.totalTokens ?? 0,
      totalRevenue: formatDecimalValue(usageAggregate._sum.totalCost) ?? "0",
      totalProviderCost: formatDecimalValue(usageAggregate._sum.providerCost) ?? "0",
      totalPlatformMarkup: formatDecimalValue(usageAggregate._sum.platformMarkup) ?? "0",
      successRate,
      avgLatencyMs: usageAggregate._avg.latencyMs
        ? Number(usageAggregate._avg.latencyMs.toFixed(2))
        : 0,
      avgResponseCompletionTimeMs: usageAggregate._avg.responseCompletionTimeMs
        ? Number(usageAggregate._avg.responseCompletionTimeMs.toFixed(2))
        : 0,
    },
    usage: {
      requestsByStatus: {
        success: statusCounts.SUCCESS ?? 0,
        failed: statusCounts.FAILED ?? 0,
        stopped: statusCounts.STOPPED ?? 0,
        pending: statusCounts.PENDING ?? 0,
        partial: statusCounts.PARTIAL ?? 0,
      },
      tokensBreakdown: {
        prompt: usageAggregate._sum.promptTokens ?? 0,
        completion: usageAggregate._sum.completionTokens ?? 0,
        total: usageAggregate._sum.totalTokens ?? 0,
      },
      revenueBreakdown: {
        providerCost: formatDecimalValue(usageAggregate._sum.providerCost) ?? "0",
        platformMarkup: formatDecimalValue(usageAggregate._sum.platformMarkup) ?? "0",
        totalBilledCost: formatDecimalValue(usageAggregate._sum.totalCost) ?? "0",
      },
      dateRange: {
        preset: dateRange.preset,
        from: dateRange.from ?? null,
        to: dateRange.to ?? null,
      },
    },
    topUsers: topUserGroups.map((item) => {
      const user = userMap.get(item.userId);

      return {
        userId: item.userId,
        email: user?.email ?? null,
        firstName: user?.firstName ?? null,
        lastName: user?.lastName ?? null,
        status: user?.status ?? null,
        requests: getGroupedCount(item._count),
        totalTokens: Number(getGroupedSumValue(item._sum, "totalTokens") ?? 0),
        totalRevenue: formatDecimalValue(getGroupedSumValue(item._sum, "totalCost")) ?? "0",
        totalMarkup: formatDecimalValue(getGroupedSumValue(item._sum, "platformMarkup")) ?? "0",
      };
    }),
    topModels: topModelGroups.map((item) => {
      const model = modelMap.get(item.modelId);

      return {
        modelId: item.modelId,
        slug: model?.slug ?? null,
        displayName: model?.displayName ?? null,
        provider: model?.provider ?? null,
        requests: getGroupedCount(item._count),
        totalTokens: Number(getGroupedSumValue(item._sum, "totalTokens") ?? 0),
        totalRevenue: formatDecimalValue(getGroupedSumValue(item._sum, "totalCost")) ?? "0",
      };
    }),
    topProviders: Array.from(providerAggMap.entries())
      .map(([providerId, aggregate]) => ({
        providerId,
        provider: providerMap.get(providerId) ?? null,
        requests: aggregate.requests,
        totalTokens: aggregate.totalTokens,
        totalRevenue: formatDecimalValue(aggregate.totalCost) ?? "0",
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, TOP_LIMIT),
  };
};

export const getAdminActivityLogsService = async (
  _actor: AdminActor,
  query: AdminActivityLogsQuery
) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);
  const { where, orderBy, meta } = buildAdminWhere(query);

  const [logs, totalRecords] = await Promise.all([
    prisma.inferenceRequest.findMany({
      where,
      select: activityLogSelect,
      orderBy,
      take,
      skip,
    }),
    prisma.inferenceRequest.count({ where }),
  ]);

  return {
    ...formatPaginationResponse(
      logs.map((row) => formatRequestFinancials(row)),
      totalRecords,
      page,
      pageSize
    ),
    ...(meta ? { meta } : {}),
  };
};

export const getAdminActivitySummaryService = async (
  _actor: AdminActor,
  query: AdminActivitySummaryQuery
) => {
  const { where, meta, dateRange } = buildAdminWhere(query);
  const andConditions = hasAndConditions(where) ? where.AND : [];

  const [totalRequests, usageAggregate, successRequests, failedRequests, stoppedRequests] =
    await Promise.all([
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
          responseCompletionTimeMs: true,
        },
      }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: "SUCCESS" }] },
      }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: "FAILED" }] },
      }),
      prisma.inferenceRequest.count({
        where: { AND: [...andConditions, { status: "STOPPED" }] },
      }),
    ]);

  return {
    range: dateRange,
    totals: {
      totalRequests,
      successRequests,
      failedRequests,
      stoppedRequests,
      promptTokens: usageAggregate._sum.promptTokens ?? 0,
      completionTokens: usageAggregate._sum.completionTokens ?? 0,
      totalTokens: usageAggregate._sum.totalTokens ?? 0,
      providerCost: formatDecimalValue(usageAggregate._sum.providerCost) ?? "0",
      platformMarkup: formatDecimalValue(usageAggregate._sum.platformMarkup) ?? "0",
      totalRevenue: formatDecimalValue(usageAggregate._sum.totalCost) ?? "0",
      averageLatencyMs: usageAggregate._avg.latencyMs
        ? Number(usageAggregate._avg.latencyMs.toFixed(2))
        : 0,
      averageResponseCompletionTimeMs: usageAggregate._avg.responseCompletionTimeMs
        ? Number(usageAggregate._avg.responseCompletionTimeMs.toFixed(2))
        : 0,
    },
    ...(meta ? { meta } : {}),
  };
};

export const getAdminActivityTimeseriesService = async (
  _actor: AdminActor,
  query: AdminActivityTimeseriesQuery
) => {
  buildAdminActivityQuery(query);
  const { meta, dateRange } = buildAdminWhere(query);
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

  const rows = await prisma.$queryRaw<TimeseriesRow[]>(Prisma.sql`
    SELECT
      ${bucketExpression} AS "bucket",
      COUNT(*) AS "requests",
      COALESCE(SUM(ir."total_tokens"), 0) AS "totalTokens",
      COALESCE(SUM(ir."provider_cost"), 0) AS "providerCost",
      COALESCE(SUM(ir."platform_markup"), 0) AS "platformMarkup",
      COALESCE(SUM(ir."total_cost"), 0) AS "totalCost"
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
      totalTokens: Number(row.totalTokens ?? 0),
      providerCost: formatDecimalValue(row.providerCost) ?? "0",
      platformMarkup: formatDecimalValue(row.platformMarkup) ?? "0",
      totalRevenue: formatDecimalValue(row.totalCost) ?? "0",
    })),
    ...(meta ? { meta } : {}),
  };
};
