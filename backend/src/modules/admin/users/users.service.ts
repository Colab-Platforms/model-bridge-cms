import { Prisma, UserStatus } from "@prisma/client";

import prisma from "../../../../prisma.js";
import AppError from "../../../shared/errors/index.js";
import { formatPaginationResponse, getPaginationOptions } from "../../../utils/paginationUtils.js";
import STATUS_CODES from "../../../utils/statusCodes.js";
import type { AdminUsersQuery, UpdateAdminUserInput } from "./users.types.js";

const userSelect = {
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
  deletedBy: true,
  userRoles: {
    select: {
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.UserSelect;

const normalizeRoles = (user: {
  userRoles: { role: { id: string; name: string } }[];
}) => ({
  roles: user.userRoles.map((item) => item.role),
});

const hasRole = (roles: string[], role: string) => roles.includes(role);

const assertCanManageUser = (actorRoles: string[], targetRoles: string[]) => {
  if (hasRole(targetRoles, "SuperAdmin") && !hasRole(actorRoles, "SuperAdmin")) {
    throw new AppError("Forbidden: SuperAdmin accounts can only be managed by SuperAdmin", STATUS_CODES.FORBIDDEN);
  }

  if (hasRole(targetRoles, "Admin") && !hasRole(actorRoles, "SuperAdmin")) {
    throw new AppError("Forbidden: Admin accounts can only be managed by SuperAdmin", STATUS_CODES.FORBIDDEN);
  }
};

const buildWhere = (query: AdminUsersQuery): Prisma.UserWhereInput => ({
  ...(query.search
    ? {
        OR: [
          { email: { contains: query.search, mode: "insensitive" } },
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
        ],
      }
    : {}),
  ...(typeof query.status !== "undefined" ? { status: query.status } : {}),
  ...(typeof query.isDeleted === "boolean" ? { isDeleted: query.isDeleted } : { isDeleted: false }),
  ...(query.role
    ? {
        userRoles: {
          some: {
            role: {
              name: query.role,
            },
          },
        },
      }
    : {}),
});

export const getAdminUsersService = async (query: AdminUsersQuery) => {
  const { take, skip, page, pageSize } = getPaginationOptions(query, 20);
  const where = buildWhere(query);

  const [users, totalRecords] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userSelect,
      orderBy: { createdAt: "desc" },
      take,
      skip,
    }),
    prisma.user.count({ where }),
  ]);

  return formatPaginationResponse(
    users.map((user) => ({
      ...user,
      ...normalizeRoles(user),
    })),
    totalRecords,
    page,
    pageSize
  );
};

export const getAdminUserByIdService = async (id: string) => {
  const user = await prisma.user.findFirst({
    where: { id },
    select: userSelect,
  });

  if (!user) {
    throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
  }

  return {
    ...user,
    ...normalizeRoles(user),
  };
};

export const updateAdminUserService = async (
  id: string,
  body: UpdateAdminUserInput,
  actor?: { actorId?: string; actorRoles?: string[] }
) => {
  const existingUser = await prisma.user.findFirst({
    where: { id },
    select: {
      id: true,
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!existingUser) {
    throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
  }

  if (actor?.actorId && actor.actorId === id) {
    throw new AppError("You cannot manage your own account from admin users", STATUS_CODES.BAD_REQUEST);
  }

  assertCanManageUser(
    actor?.actorRoles ?? [],
    existingUser.userRoles.map((item) => item.role.name)
  );

  return prisma.user.update({
    where: { id },
    data: {
      ...(body.firstName !== undefined ? { firstName: body.firstName } : {}),
      ...(body.lastName !== undefined ? { lastName: body.lastName } : {}),
      ...(body.phoneNo !== undefined ? { phoneNo: body.phoneNo } : {}),
      ...(body.countryCode !== undefined ? { countryCode: body.countryCode } : {}),
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.state !== undefined ? { state: body.state } : {}),
      ...(body.country !== undefined ? { country: body.country } : {}),
      ...(body.timezone !== undefined ? { timezone: body.timezone } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
    select: userSelect,
  }).then((user) => ({
    ...user,
    ...normalizeRoles(user),
  }));
};

export const deleteAdminUserService = async (
  id: string,
  actor?: { actorId?: string; actorRoles?: string[] }
) => {
  const existingUser = await prisma.user.findFirst({
    where: { id, isDeleted: false },
    select: {
      id: true,
      userRoles: {
        select: {
          role: {
            select: { name: true },
          },
        },
      },
    },
  });

  if (!existingUser) {
    throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
  }

  if (actor?.actorId && actor.actorId === id) {
    throw new AppError("You cannot delete your own account from admin users", STATUS_CODES.BAD_REQUEST);
  }

  assertCanManageUser(
    actor?.actorRoles ?? [],
    existingUser.userRoles.map((item) => item.role.name)
  );

  return prisma.user.update({
    where: { id },
    data: {
      isDeleted: true,
      deletedBy: actor?.actorId ?? null,
      updatedBy: actor?.actorId ?? null,
      status: UserStatus.INACTIVE,
    },
    select: userSelect,
  }).then((user) => ({
    ...user,
    ...normalizeRoles(user),
  }));
};
