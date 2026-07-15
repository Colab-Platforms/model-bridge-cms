import { z } from "zod";

import { validateParams, validateQuery } from "../../shared/middlewares/validate.js";

const stringArrayParamSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) => {
    const values = Array.isArray(value) ? value : [value];

    return values
      .flatMap((item) => item.split(","))
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  });

export const modelIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const getAllModelsQuerySchema = z.object({
  q: z.string().trim().min(1).optional(),
  providerId: stringArrayParamSchema.optional(),
  slug: z.string().trim().min(1).optional(),
  capability: stringArrayParamSchema
    .transform((values) => values.map((value) => value.toUpperCase()))
    .optional(),
  inputModality: stringArrayParamSchema
    .transform((values) => values.map((value) => value.toLowerCase()))
    .optional(),
  outputModality: stringArrayParamSchema
    .transform((values) => values.map((value) => value.toLowerCase()))
    .optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  minContext: z.coerce.number().int().positive().optional(),
  maxContext: z.coerce.number().int().positive().optional(),
  maxInputPrice: z.coerce.number().nonnegative().optional(),
  maxOutputPrice: z.coerce.number().nonnegative().optional(),
  sort: z
    .enum([
      "newest",
      "name_asc",
      "price_input_asc",
      "price_input_desc",
      "price_output_asc",
      "price_output_desc",
      "context_asc",
      "context_desc",
    ])
    .optional(),
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
});

export const modelIdParamsValidator = validateParams(modelIdParamsSchema);
export const getAllModelsQueryValidator = validateQuery(getAllModelsQuerySchema);
