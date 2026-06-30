import { ActivityType, ApiKeyStatus, Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { activityLogService } from "../../services/activity-log.service.js";
import { generateApiKey } from "../../utils/generateApiKey.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type {
  CreateApiKeyInput,
  GetAllApiKeysQuery,
  UpdateApiKeyInput,
} from "./api-keys.types.js";

const formatDecimalValue = (value: Prisma.Decimal | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toFixed(Math.max(value.decimalPlaces(), 2));
};

const formatApiKeyRecord = <
  T extends {
    creditLimit: Prisma.Decimal | null;
  },
>(
  apiKey: T
) => ({
  ...apiKey,
  creditLimit: formatDecimalValue(apiKey.creditLimit),
});

const apiKeySelect = {
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
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
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
} satisfies Prisma.ApiKeySelect;

const apiKeyWhere = (query?: GetAllApiKeysQuery): Prisma.ApiKeyWhereInput => ({
  isDeleted: false,
  ...(query?.status ? { status: query.status } : {}),
  ...(query?.projectId ? { projectId: query.projectId } : {}),
  ...(query?.userId ? { userId: query.userId } : {}),
});

const ensureUserAndProject = async (userId: string, projectId: string) => {
  const [user, project] = await Promise.all([
    prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
      },
      select: { id: true },
    }),
    prisma.project.findFirst({
      where: {
        id: projectId,
        isDeleted: false,
      },
      select: { id: true, userId: true },
    }),
  ]);

  if (!user) {
    throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
  }

  if (!project) {
    throw new AppError("Project not found", STATUS_CODES.NOT_FOUND);
  }

  if (project.userId !== userId) {
    throw new AppError(
      "Project does not belong to the provided user",
      STATUS_CODES.BAD_REQUEST
    );
  }
};

export const createApiKeyService = async (body: CreateApiKeyInput, actorId?: string) => {
  await ensureUserAndProject(body.userId, body.projectId);

  const generatedKey = generateApiKey();

  const apiKey = await prisma.$transaction(async (tx) => {
    const createdApiKey = await tx.apiKey.create({
      data: {
        userId: body.userId,
        projectId: body.projectId,
        name: body.name,
        keyPrefix: generatedKey.keyPrefix,
        keyHash: generatedKey.keyHash,
        creditLimit: body.creditLimit,
        limitType: body.limitType,
        status: body.status ?? ApiKeyStatus.ACTIVE,
        expiresAt: body.expiresAt,
      },
      select: apiKeySelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.API_KEY_CREATED,
        entityType: "API_KEY",
        entityId: createdApiKey.id,
        actorId: actorId ?? body.userId,
        userId: createdApiKey.userId,
        projectId: createdApiKey.projectId,
        metadata: {
          name: createdApiKey.name,
          keyPrefix: createdApiKey.keyPrefix,
          status: createdApiKey.status,
          expiresAt: createdApiKey.expiresAt?.toISOString() ?? null,
        },
      },
      tx
    );

    return createdApiKey;
  });

  return {
    ...formatApiKeyRecord(apiKey),
    apiKey: generatedKey.apiKey,
  };
};

export const getAllApiKeysService = async (query: GetAllApiKeysQuery) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: apiKeyWhere(query),
    select: apiKeySelect,
    orderBy: { createdAt: "desc" },
  });

  return apiKeys.map((apiKey) => formatApiKeyRecord(apiKey));
};

export const getApiKeyByIdService = async (id: string) => {
  const apiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: apiKeySelect,
  });

  if (!apiKey) {
    throw new AppError("API key not found", STATUS_CODES.NOT_FOUND);
  }

  return formatApiKeyRecord(apiKey);
};

export const updateApiKeyService = async (id: string, body: UpdateApiKeyInput, _actorId?: string) => {
  const existingApiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: apiKeySelect,
  });

  if (!existingApiKey) {
    throw new AppError("API key not found", STATUS_CODES.NOT_FOUND);
  }

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.creditLimit !== undefined ? { creditLimit: body.creditLimit } : {}),
      ...(body.limitType !== undefined ? { limitType: body.limitType } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.expiresAt !== undefined ? { expiresAt: body.expiresAt } : {}),
    },
    select: apiKeySelect,
  });

  return formatApiKeyRecord(apiKey);
};

export const getApiKeysByProjectIdService = async (projectId: string) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: apiKeyWhere({ projectId }),
    select: apiKeySelect,
    orderBy: { createdAt: "desc" },
  });

  return apiKeys.map((apiKey) => formatApiKeyRecord(apiKey));
};

export const getApiKeysByUserIdService = async (userId: string) => {
  const apiKeys = await prisma.apiKey.findMany({
    where: apiKeyWhere({ userId }),
    select: apiKeySelect,
    orderBy: { createdAt: "desc" },
  });

  return apiKeys.map((apiKey) => formatApiKeyRecord(apiKey));
};

export const deleteApiKeyService = async (id: string, _actorId?: string) => {
  const existingApiKey = await prisma.apiKey.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: apiKeySelect,
  });

  if (!existingApiKey) {
    throw new AppError("API key not found", STATUS_CODES.NOT_FOUND);
  }

  const apiKey = await prisma.apiKey.update({
    where: { id },
    data: {
      isDeleted: true,
      status: ApiKeyStatus.REVOKED,
    },
    select: apiKeySelect,
  });

  return formatApiKeyRecord(apiKey);
};
