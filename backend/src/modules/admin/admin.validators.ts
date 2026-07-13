import { ApiKeyStatus, RequestStatus, RequestType } from "@prisma/client";
import { z } from "zod";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";

const dateRangePresetSchema = z.enum([
  "today",
  "past_24h",
  "weekly",
  "monthly",
  "yearly",
  "custom",
]);

const baseAdminActivityQuerySchema = z
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

export const adminOverviewQuerySchema = baseAdminActivityQuerySchema;

export const adminActivityLogsQuerySchema = baseAdminActivityQuerySchema.extend({
  sort: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const adminActivitySummaryQuerySchema = baseAdminActivityQuerySchema;

export const adminActivityTimeseriesQuerySchema = baseAdminActivityQuerySchema.extend({
  granularity: z.enum(["hour", "day", "week", "month"]).optional(),
});

export const adminUsersQuerySchema = z.object({
  search: z.string().trim().min(1).max(120).optional(),
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]).optional(),
  isDeleted: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  sort: z.string().trim().min(1).optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const adminUserIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const adminUserStatusBodySchema = z.object({
  status: z.enum(["ACTIVE", "SUSPENDED", "INACTIVE"]),
});

export const adminApiKeyStatusBodySchema = z.object({
  status: z.nativeEnum(ApiKeyStatus),
});

const decimalValueSchema = z.union([z.number(), z.string().trim().min(1)]);
const modelOutputPricingUnitSchema = z.enum(["TOKEN", "IMAGE"]);

export const adminProviderQuerySchema = z.object({
  slug: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const adminProviderBodySchema = z.object({
  slug: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  baseUrl: z.string().trim().url().optional(),
  isActive: z.boolean().optional(),
});

export const adminProviderUpdateBodySchema = z
  .object({
    slug: z.string().trim().min(1).optional(),
    displayName: z.string().trim().min(1).optional(),
    description: z.string().trim().min(1).nullable().optional(),
    baseUrl: z.string().trim().url().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const adminModelsQuerySchema = z.object({
  providerId: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const adminModelBodySchema = z.object({
  providerId: z.string().trim().min(1),
  slug: z.string().trim().min(1),
  displayName: z.string().trim().min(1).optional(),
  description: z.string().trim().min(1).optional(),
  contextLength: z.number().int().positive().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  tokenizer: z.string().trim().min(1).optional(),
  inputPricePerToken: decimalValueSchema.optional(),
  outputPricePerToken: decimalValueSchema.optional(),
  outputPricingUnit: modelOutputPricingUnitSchema.optional(),
  imageOutputPrice: decimalValueSchema.optional(),
  cacheWritePricePerToken: decimalValueSchema.optional(),
  cacheReadPricePerToken: decimalValueSchema.optional(),
  inputModalities: z.array(z.string().trim().min(1)).optional(),
  outputModalities: z.array(z.string().trim().min(1)).optional(),
  supportedParameters: z.array(z.string().trim().min(1)).optional(),
  defaultForCapabilities: z.array(z.string().trim().min(1)).optional(),
  isActive: z.boolean().optional(),
}).superRefine((value, ctx) => {
  if (value.outputPricingUnit === "IMAGE" && value.imageOutputPrice == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["imageOutputPrice"],
      message: "imageOutputPrice is required when outputPricingUnit is IMAGE",
    });
  }
});

export const adminModelUpdateBodySchema = z
  .object({
    providerId: z.string().trim().min(1).optional(),
    slug: z.string().trim().min(1).optional(),
    displayName: z.string().trim().min(1).nullable().optional(),
    description: z.string().trim().min(1).nullable().optional(),
    contextLength: z.number().int().positive().nullable().optional(),
    maxOutputTokens: z.number().int().positive().nullable().optional(),
    tokenizer: z.string().trim().min(1).nullable().optional(),
    inputPricePerToken: decimalValueSchema.nullable().optional(),
    outputPricePerToken: decimalValueSchema.nullable().optional(),
    outputPricingUnit: modelOutputPricingUnitSchema.optional(),
    imageOutputPrice: decimalValueSchema.nullable().optional(),
    cacheWritePricePerToken: decimalValueSchema.nullable().optional(),
    cacheReadPricePerToken: decimalValueSchema.nullable().optional(),
    inputModalities: z.array(z.string().trim().min(1)).optional(),
    outputModalities: z.array(z.string().trim().min(1)).optional(),
    supportedParameters: z.array(z.string().trim().min(1)).optional(),
    defaultForCapabilities: z.array(z.string().trim().min(1)).optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (Object.keys(value).length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "At least one field is required for update",
      });
    }

    if (
      value.outputPricingUnit === "IMAGE" &&
      value.imageOutputPrice == null
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["imageOutputPrice"],
        message: "imageOutputPrice is required when outputPricingUnit is IMAGE",
      });
    }
  });

export const adminOverviewQueryValidator = validateQuery(adminOverviewQuerySchema);
export const adminActivityLogsQueryValidator = validateQuery(adminActivityLogsQuerySchema);
export const adminActivitySummaryQueryValidator = validateQuery(adminActivitySummaryQuerySchema);
export const adminActivityTimeseriesQueryValidator = validateQuery(
  adminActivityTimeseriesQuerySchema
);
export const adminUsersQueryValidator = validateQuery(adminUsersQuerySchema);
export const adminUserIdParamsValidator = validateParams(adminUserIdParamsSchema);
export const adminUserStatusBodyValidator = validateBody(adminUserStatusBodySchema);
export const adminApiKeyStatusBodyValidator = validateBody(adminApiKeyStatusBodySchema);
export const adminProviderQueryValidator = validateQuery(adminProviderQuerySchema);
export const adminProviderBodyValidator = validateBody(adminProviderBodySchema);
export const adminProviderUpdateBodyValidator = validateBody(adminProviderUpdateBodySchema);
export const adminModelsQueryValidator = validateQuery(adminModelsQuerySchema);
export const adminModelBodyValidator = validateBody(adminModelBodySchema);
export const adminModelUpdateBodyValidator = validateBody(adminModelUpdateBodySchema);
