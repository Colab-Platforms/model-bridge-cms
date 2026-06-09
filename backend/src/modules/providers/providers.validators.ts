import { z } from "zod";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";

export const providerIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const providerListQuerySchema = z.object({
  slug: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const createProviderSchema = z.object({
  slug: z.string().trim().min(1),
  displayName: z.string().trim().min(1),
  description: z.string().trim().min(1).optional(),
  baseUrl: z.string().trim().url().optional(),
  isActive: z.boolean().optional(),
});

export const updateProviderSchema = z
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

export const providerIdParamsValidator = validateParams(providerIdParamsSchema);
export const providerListQueryValidator = validateQuery(providerListQuerySchema);
export const createProviderValidator = validateBody(createProviderSchema);
export const updateProviderValidator = validateBody(updateProviderSchema);
