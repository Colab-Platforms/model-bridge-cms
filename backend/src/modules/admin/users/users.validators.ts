import { UserStatus } from "@prisma/client";
import { z } from "zod";

import { validateBody, validateParams, validateQuery } from "../../../shared/middlewares/validate.js";

export const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
  search: z.string().trim().min(1).optional(),
  status: z.nativeEnum(UserStatus).optional(),
  role: z.enum(["User", "Admin", "SuperAdmin"]).optional(),
  isDeleted: z.coerce.boolean().optional(),
});

export const adminUserIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const updateAdminUserSchema = z
  .object({
    firstName: z.string().trim().min(1).nullable().optional(),
    lastName: z.string().trim().min(1).nullable().optional(),
    phoneNo: z.string().trim().min(1).nullable().optional(),
    countryCode: z.string().trim().min(1).nullable().optional(),
    city: z.string().trim().min(1).nullable().optional(),
    state: z.string().trim().min(1).nullable().optional(),
    country: z.string().trim().min(1).nullable().optional(),
    timezone: z.string().trim().min(1).nullable().optional(),
    status: z.nativeEnum(UserStatus).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const adminUsersQueryValidator = validateQuery(adminUsersQuerySchema);
export const adminUserIdParamsValidator = validateParams(adminUserIdParamsSchema);
export const updateAdminUserValidator = validateBody(updateAdminUserSchema);
