import type z from "zod";

import type { AdminActor } from "../admin.types.js";
import {
  adminRevenueByApiKeysQuerySchema,
  adminRevenueByModelsQuerySchema,
  adminRevenueByProjectsQuerySchema,
  adminRevenueByProvidersQuerySchema,
  adminRevenueByUsersQuerySchema,
  adminRevenueSummaryQuerySchema,
  adminRevenueTimeseriesQuerySchema,
} from "./revenue.validators.js";

export type AdminRevenueActor = AdminActor;
export type AdminRevenueSummaryQuery = z.infer<typeof adminRevenueSummaryQuerySchema>;
export type AdminRevenueTimeseriesQuery = z.infer<typeof adminRevenueTimeseriesQuerySchema>;
export type AdminRevenueByUsersQuery = z.infer<typeof adminRevenueByUsersQuerySchema>;
export type AdminRevenueByModelsQuery = z.infer<typeof adminRevenueByModelsQuerySchema>;
export type AdminRevenueByProvidersQuery = z.infer<typeof adminRevenueByProvidersQuerySchema>;
export type AdminRevenueByProjectsQuery = z.infer<typeof adminRevenueByProjectsQuerySchema>;
export type AdminRevenueByApiKeysQuery = z.infer<typeof adminRevenueByApiKeysQuerySchema>;
