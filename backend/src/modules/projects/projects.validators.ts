import { z } from "zod";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .regex(/^[a-zA-Z0-9-_]+$/, "Slug can only contain letters, numbers, hyphens, and underscores");

export const createProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: slugSchema.optional(),
  description: z.string().trim().max(5000).optional(),
  isActive: z.boolean().optional(),
});

export const updateProjectSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    slug: slugSchema.nullable().optional(),
    description: z.string().trim().max(5000).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const projectIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const getAllProjectsQuerySchema = z.object({
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  slug: z.string().trim().min(1).optional(),
  search: z.string().trim().min(1).max(120).optional(),
});

export const createProjectValidator = validateBody(createProjectSchema);
export const updateProjectValidator = validateBody(updateProjectSchema);
export const projectIdParamsValidator = validateParams(projectIdParamsSchema);
export const getAllProjectsQueryValidator = validateQuery(getAllProjectsQuerySchema);
