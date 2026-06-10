import { z } from "zod";

import { validateParams, validateQuery } from "../../shared/middlewares/validate.js";

export const modelIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const getAllModelsQuerySchema = z.object({
  providerId: z.string().trim().min(1).optional(),
  slug: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const modelIdParamsValidator = validateParams(modelIdParamsSchema);
export const getAllModelsQueryValidator = validateQuery(getAllModelsQuerySchema);
