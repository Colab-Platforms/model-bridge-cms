import { ActivityType, ApiKeyStatus, Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { activityLogService } from "../../services/activity-log.service.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type {
  CreateProjectInput,
  GetAllProjectsQuery,
  UpdateProjectInput,
} from "./projects.types.js";

const projectSelect = {
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

const toBaseSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100) || "project";

const ensureProjectSlug = async (
  userId: string,
  source: string,
  excludeProjectId?: string
) => {
  const baseSlug = toBaseSlug(source);
  let candidate = baseSlug;
  let suffix = 1;

  while (true) {
    const existingProject = await prisma.project.findFirst({
      where: {
        userId,
        slug: candidate,
        isDeleted: false,
        ...(excludeProjectId ? { id: { not: excludeProjectId } } : {}),
      },
      select: { id: true },
    });

    if (!existingProject) {
      return candidate;
    }

    suffix += 1;
    candidate = `${baseSlug}-${suffix}`;
  }
};

const ensureUserExists = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!user) {
    throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
  }
};

const getOwnedProjectOrThrow = async (userId: string, projectId: string) => {
  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      userId,
      isDeleted: false,
    },
    select: projectSelect,
  });

  if (!project) {
    throw new AppError("Project not found", STATUS_CODES.NOT_FOUND);
  }

  return project;
};

export const createProjectService = async (
  userId: string,
  body: CreateProjectInput,
  actorId?: string
) => {
  await ensureUserExists(userId);

  const slug = await ensureProjectSlug(userId, body.slug ?? body.name);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        userId,
        slug,
        name: body.name,
        description: body.description,
        isActive: body.isActive ?? true,
        createdBy: actorId ?? userId,
        updatedBy: actorId ?? userId,
      },
      select: projectSelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROJECT_CREATED,
        entityType: "PROJECT",
        entityId: project.id,
        actorId: actorId ?? userId,
        userId,
        projectId: project.id,
        metadata: {
          name: project.name,
          slug: project.slug,
          isActive: project.isActive,
        },
      },
      tx
    );

    return project;
  });
};

export const getAllProjectsService = async (userId: string, query: GetAllProjectsQuery) => {
  return prisma.project.findMany({
    where: {
      userId,
      isDeleted: false,
      ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
      ...(query.slug ? { slug: query.slug } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: "insensitive" } },
              { slug: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: projectSelect,
    orderBy: { createdAt: "desc" },
  });
};

export const getProjectByIdService = async (userId: string, projectId: string) => {
  return getOwnedProjectOrThrow(userId, projectId);
};

export const updateProjectService = async (
  userId: string,
  projectId: string,
  body: UpdateProjectInput,
  actorId?: string
) => {
  const existingProject = await getOwnedProjectOrThrow(userId, projectId);

  const nextSlug =
    body.slug === undefined
      ? undefined
      : body.slug === null
        ? await ensureProjectSlug(userId, body.name ?? "project", projectId)
        : await ensureProjectSlug(userId, body.slug, projectId);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: {
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.description !== undefined ? { description: body.description } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
        ...(nextSlug !== undefined ? { slug: nextSlug } : {}),
        updatedBy: actorId ?? userId,
      },
      select: projectSelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROJECT_UPDATED,
        entityType: "PROJECT",
        entityId: project.id,
        actorId: actorId ?? userId,
        userId,
        projectId: project.id,
        metadata: {
          before: {
            name: existingProject.name,
            slug: existingProject.slug,
            description: existingProject.description,
            isActive: existingProject.isActive,
          },
          after: {
            name: project.name,
            slug: project.slug,
            description: project.description,
            isActive: project.isActive,
          },
        },
      },
      tx
    );

    return project;
  });
};

export const deleteProjectService = async (userId: string, projectId: string, actorId?: string) => {
  await getOwnedProjectOrThrow(userId, projectId);

  return prisma.$transaction(async (tx) => {
    const project = await tx.project.update({
      where: { id: projectId },
      data: {
        isDeleted: true,
        isActive: false,
        deletedBy: actorId ?? userId,
        updatedBy: actorId ?? userId,
      },
      select: projectSelect,
    });

    await tx.apiKey.updateMany({
      where: {
        projectId,
        isDeleted: false,
      },
      data: {
        isDeleted: true,
        status: ApiKeyStatus.REVOKED,
      },
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROJECT_DELETED,
        entityType: "PROJECT",
        entityId: project.id,
        actorId: actorId ?? userId,
        userId,
        projectId: project.id,
        metadata: {
          name: project.name,
          slug: project.slug,
          isActive: project.isActive,
        },
      },
      tx
    );

    return project;
  });
};
