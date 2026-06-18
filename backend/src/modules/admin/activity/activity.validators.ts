import { RequestStatus, RequestType } from "@prisma/client";
import { z } from "zod";

import { validateQuery } from "../../../shared/middlewares/validate.js";

const activityDateRangePresetSchema = z.enum([
  "today",
  "past_24h",
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);

const baseActivityQuerySchema = z
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
    dateRangePreset: activityDateRangePresetSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    page: z.coerce.number().int().positive().optional(),
    pageSize: z.coerce.number().int().positive().max(100).optional(),
  })
  .refine((value) => !(value.dateRangePreset === "custom" && !value.from && !value.to), {
    message: "Custom date range requires at least one of from or to",
    path: ["dateRangePreset"],
  });

export const adminActivityByUsersQuerySchema = baseActivityQuerySchema;
export const adminActivityByModelsQuerySchema = baseActivityQuerySchema;
export const adminActivityByProvidersQuerySchema = baseActivityQuerySchema;
export const adminActivityByProjectsQuerySchema = baseActivityQuerySchema;
export const adminActivityByApiKeysQuerySchema = baseActivityQuerySchema;

export const adminActivityByUsersQueryValidator = validateQuery(
  adminActivityByUsersQuerySchema
);
export const adminActivityByModelsQueryValidator = validateQuery(
  adminActivityByModelsQuerySchema
);
export const adminActivityByProvidersQueryValidator = validateQuery(
  adminActivityByProvidersQuerySchema
);
export const adminActivityByProjectsQueryValidator = validateQuery(
  adminActivityByProjectsQuerySchema
);
export const adminActivityByApiKeysQueryValidator = validateQuery(
  adminActivityByApiKeysQuerySchema
);
