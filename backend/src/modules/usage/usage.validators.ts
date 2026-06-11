import { RequestStatus, RequestType } from "@prisma/client";
import { z } from "zod";

import { validateQuery } from "../../shared/middlewares/validate.js";

const dateRangePresetSchema = z.enum([
  "today",
  "past_24h",
  "past_7d",
  "past_30d",
  "past_1y",
  "custom",
]);

const baseUsageQuerySchema = z
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
    dateRangePreset: dateRangePresetSchema.optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
  })
  .refine((value) => !(value.dateRangePreset === "custom" && !value.from && !value.to), {
    message: "Custom date range requires at least one of from or to",
    path: ["dateRangePreset"],
  });

export const getUsageLogsQuerySchema = baseUsageQuerySchema.extend({
  sort: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const getUsageSummaryQuerySchema = baseUsageQuerySchema;

export const getUsageTimeseriesQuerySchema = baseUsageQuerySchema.extend({
  granularity: z.enum(["hour", "day", "week", "month"]).optional(),
});

export const getUsageLogsQueryValidator = validateQuery(getUsageLogsQuerySchema);
export const getUsageSummaryQueryValidator = validateQuery(getUsageSummaryQuerySchema);
export const getUsageTimeseriesQueryValidator = validateQuery(getUsageTimeseriesQuerySchema);
