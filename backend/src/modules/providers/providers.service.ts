import { ActivityType, Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { activityLogService } from "../../services/activity-log.service.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type {
  CreateProviderInput,
  ProviderListQuery,
  UpdateProviderInput,
} from "./providers.types.js";

const providerSelect = {
  id: true,
  slug: true,
  displayName: true,
  description: true,
  baseUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProviderSelect;

export const getAllProvidersService = async (query: ProviderListQuery) => {
  return prisma.provider.findMany({
    where: {
      isDeleted: false,
      ...(query.slug ? { slug: query.slug } : {}),
      ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
    },
    select: providerSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getProviderByIdService = async (id: string) => {
  const provider = await prisma.provider.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: providerSelect,
  });

  if (!provider) {
    throw new AppError("Provider not found", STATUS_CODES.NOT_FOUND);
  }

  return provider;
};

export const createProviderService = async (body: CreateProviderInput, actorId?: string) => {
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
        select: providerSelect,
      });

      await activityLogService.log(
        {
          activityType: provider.isActive
            ? ActivityType.PROVIDER_ENABLED
            : ActivityType.PROVIDER_DISABLED,
          entityType: "PROVIDER",
          entityId: provider.id,
          actorId,
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

export const updateProviderService = async (id: string, body: UpdateProviderInput, actorId?: string) => {
  const existingProvider = await prisma.provider.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: providerSelect,
  });

  if (!existingProvider) {
    throw new AppError("Provider not found", STATUS_CODES.NOT_FOUND);
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const provider = await tx.provider.update({
        where: { id },
        data: {
          ...(body.slug !== undefined ? { slug: body.slug } : {}),
          ...(body.displayName !== undefined ? { displayName: body.displayName } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.baseUrl !== undefined ? { baseUrl: body.baseUrl } : {}),
          ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        },
        select: providerSelect,
      });

      await activityLogService.log(
        {
          activityType: provider.isActive
            ? ActivityType.PROVIDER_ENABLED
            : ActivityType.PROVIDER_DISABLED,
          entityType: "PROVIDER",
          entityId: provider.id,
          actorId,
          metadata: {
            action: "updated",
            before: {
              slug: existingProvider.slug,
              displayName: existingProvider.displayName,
              description: existingProvider.description,
              baseUrl: existingProvider.baseUrl,
              isActive: existingProvider.isActive,
            },
            after: {
              slug: provider.slug,
              displayName: provider.displayName,
              description: provider.description,
              baseUrl: provider.baseUrl,
              isActive: provider.isActive,
            },
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

export const deleteProviderService = async (id: string, actorId?: string) => {
  const existingProvider = await prisma.provider.findFirst({
    where: {
      id,
      isDeleted: false,
    },
    select: providerSelect,
  });

  if (!existingProvider) {
    throw new AppError("Provider not found", STATUS_CODES.NOT_FOUND);
  }

  return prisma.$transaction(async (tx) => {
    const provider = await tx.provider.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isActive: false,
      },
      select: providerSelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROVIDER_DISABLED,
        entityType: "PROVIDER",
        entityId: provider.id,
        actorId,
        metadata: {
          action: "deleted",
          slug: existingProvider.slug,
          displayName: existingProvider.displayName,
        },
      },
      tx
    );

    return provider;
  });
};
