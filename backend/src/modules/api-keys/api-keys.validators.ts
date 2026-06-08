import { ApiKeyStatus, LimitType } from "@prisma/client";
import { z } from "zod";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";

const decimalValueSchema = z.union([z.number(), z.string().trim().min(1)]);

export const createApiKeySchema = z.object({
  userId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  name: z.string().trim().min(1).optional(),
  creditLimit: decimalValueSchema.optional(),
  limitType: z.nativeEnum(LimitType).optional(),
  status: z.nativeEnum(ApiKeyStatus).optional(),
  expiresAt: z.coerce.date().optional(),
});

export const updateApiKeySchema = z
  .object({
    name: z.string().trim().min(1).optional(),
    creditLimit: decimalValueSchema.optional(),
    limitType: z.nativeEnum(LimitType).nullable().optional(),
    status: z.nativeEnum(ApiKeyStatus).optional(),
    expiresAt: z.coerce.date().nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const apiKeyIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const apiKeyProjectIdParamsSchema = z.object({
  projectId: z.string().trim().min(1),
});

export const apiKeyUserIdParamsSchema = z.object({
  userId: z.string().trim().min(1),
});

export const getAllApiKeysQuerySchema = z.object({
  status: z.nativeEnum(ApiKeyStatus).optional(),
  projectId: z.string().trim().min(1).optional(),
  userId: z.string().trim().min(1).optional(),
});

export const createApiKeyValidator = validateBody(createApiKeySchema);
export const updateApiKeyValidator = validateBody(updateApiKeySchema);
export const apiKeyIdParamsValidator = validateParams(apiKeyIdParamsSchema);
export const apiKeyProjectIdParamsValidator = validateParams(apiKeyProjectIdParamsSchema);
export const apiKeyUserIdParamsValidator = validateParams(apiKeyUserIdParamsSchema);
export const getAllApiKeysQueryValidator = validateQuery(getAllApiKeysQuerySchema);
