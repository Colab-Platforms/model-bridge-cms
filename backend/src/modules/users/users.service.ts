import { Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";

const currentUserSelect = {
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
  isVerified: true,
  timezone: true,
  createdAt: true,
  updatedAt: true,
  userRoles: {
    where: {
      deletedAt: null,
    },
    select: {
      role: {
        select: {
          name: true,
        },
      },
    },
    take: 1,
  },
} satisfies Prisma.UserSelect;

type CurrentUserRecord = Prisma.UserGetPayload<{ select: typeof currentUserSelect }>;

const mapCurrentUser = ({ userRoles, ...user }: CurrentUserRecord) => ({
  ...user,
  role: userRoles[0]?.role.name ?? null,
});

export const getCurrentUserService = async (userId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: currentUserSelect,
  });

  if (!user) {
    throw new AppError("User not found", STATUS_CODES.NOT_FOUND);
  }

  return mapCurrentUser(user);
};
