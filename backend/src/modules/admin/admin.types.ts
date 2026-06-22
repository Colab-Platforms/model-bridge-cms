import type z from "zod";

import {
  adminActivityLogsQuerySchema,
  adminActivitySummaryQuerySchema,
  adminActivityTimeseriesQuerySchema,
  adminApiKeyStatusBodySchema,
  adminModelBodySchema,
  adminModelsQuerySchema,
  adminModelUpdateBodySchema,
  adminOverviewQuerySchema,
  adminProviderBodySchema,
  adminProviderQuerySchema,
  adminProviderUpdateBodySchema,
  adminUserIdParamsSchema,
  adminUsersQuerySchema,
  adminUserStatusBodySchema,
} from "./admin.validators.js";

export type AdminActor = {
  id: string;
  roles: string[];
};

export type AdminOverviewQuery = z.infer<typeof adminOverviewQuerySchema>;
export type AdminActivityLogsQuery = z.infer<typeof adminActivityLogsQuerySchema>;
export type AdminActivitySummaryQuery = z.infer<typeof adminActivitySummaryQuerySchema>;
export type AdminActivityTimeseriesQuery = z.infer<typeof adminActivityTimeseriesQuerySchema>;
export type AdminUsersQuery = z.infer<typeof adminUsersQuerySchema>;
export type AdminUserIdParams = z.infer<typeof adminUserIdParamsSchema>;
export type AdminUserStatusBody = z.infer<typeof adminUserStatusBodySchema>;
export type AdminApiKeyStatusBody = z.infer<typeof adminApiKeyStatusBodySchema>;
export type AdminProviderQuery = z.infer<typeof adminProviderQuerySchema>;
export type AdminProviderBody = z.infer<typeof adminProviderBodySchema>;
export type AdminProviderUpdateBody = z.infer<typeof adminProviderUpdateBodySchema>;
export type AdminModelsQuery = z.infer<typeof adminModelsQuerySchema>;
export type AdminModelBody = z.infer<typeof adminModelBodySchema>;
export type AdminModelUpdateBody = z.infer<typeof adminModelUpdateBodySchema>;
