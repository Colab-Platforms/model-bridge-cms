import type z from "zod";

import type { AdminActor } from "../admin.types.js";
import {
  adminActivityByApiKeysQuerySchema,
  adminActivityByModelsQuerySchema,
  adminActivityByProjectsQuerySchema,
  adminActivityByProvidersQuerySchema,
  adminActivityByUsersQuerySchema,
} from "./activity.validators.js";

export type AdminActivityActor = AdminActor;
export type AdminActivityByUsersQuery = z.infer<typeof adminActivityByUsersQuerySchema>;
export type AdminActivityByModelsQuery = z.infer<typeof adminActivityByModelsQuerySchema>;
export type AdminActivityByProvidersQuery = z.infer<typeof adminActivityByProvidersQuerySchema>;
export type AdminActivityByProjectsQuery = z.infer<typeof adminActivityByProjectsQuerySchema>;
export type AdminActivityByApiKeysQuery = z.infer<typeof adminActivityByApiKeysQuerySchema>;
