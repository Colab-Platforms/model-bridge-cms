import type z from "zod";

import {
  adminUserIdParamsSchema,
  adminUsersQuerySchema,
  updateAdminUserSchema,
} from "./users.validators.js";

export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminUserIdParams = z.infer<typeof adminUserIdParamsSchema>;
export type UpdateAdminUserInput = z.infer<typeof updateAdminUserSchema>;
