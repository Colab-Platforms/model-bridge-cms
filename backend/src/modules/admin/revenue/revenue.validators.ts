import { RequestStatus, RequestType } from "@prisma/client";
import { z } from "zod";

import { validateQuery } from "../../../shared/middlewares/validate.js";

const revenueDateRangePresetSchema = z.enum([
  "today",
  "past_24h",
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);

const baseRevenueQuerySchema = z
  .object({
    userId: z.string().trim().min(1).optional(),
    projectId: z.string().trim().min(1).optional(),
    apiKeyId: z.string().trim().min(1).optional(),
    modelId: z.string().trim().min(1).optional(),
    providerId: z.string().trim().min(1).optional(),
    status: z.nativeEnum(RequestStatus).optional(),
    requestType: z.nativeEnum(RequestType).optional(),
    stream: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    search: z.string().trim().min(1).max(120).optional(),
    dateRangePreset: revenueDateRangePresetSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((value) => !(value.dateRangePreset === "custom" && !value.from && !value.to), {
    message: "Custom date range requires at least one of from or to",
    path: ["dateRangePreset"],
  });

export const adminRevenueSummaryQuerySchema = baseRevenueQuerySchema;

export const adminRevenueTimeseriesQuerySchema = baseRevenueQuerySchema.extend({
  granularity: z.enum(["hour", "day", "week", "month"]).optional(),
});

export const adminRevenueByUsersQuerySchema = baseRevenueQuerySchema.extend({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const adminRevenueByModelsQuerySchema = adminRevenueByUsersQuerySchema;
export const adminRevenueByProvidersQuerySchema = adminRevenueByUsersQuerySchema;
export const adminRevenueByProjectsQuerySchema = adminRevenueByUsersQuerySchema;
export const adminRevenueByApiKeysQuerySchema = adminRevenueByUsersQuerySchema;

export const adminRevenueSummaryQueryValidator = validateQuery(adminRevenueSummaryQuerySchema);
export const adminRevenueTimeseriesQueryValidator = validateQuery(
  adminRevenueTimeseriesQuerySchema
);
export const adminRevenueByUsersQueryValidator = validateQuery(
  adminRevenueByUsersQuerySchema
);
export const adminRevenueByModelsQueryValidator = validateQuery(
  adminRevenueByModelsQuerySchema
);
export const adminRevenueByProvidersQueryValidator = validateQuery(
  adminRevenueByProvidersQuerySchema
);
export const adminRevenueByProjectsQueryValidator = validateQuery(
  adminRevenueByProjectsQuerySchema
);
export const adminRevenueByApiKeysQueryValidator = validateQuery(
  adminRevenueByApiKeysQuerySchema
);
