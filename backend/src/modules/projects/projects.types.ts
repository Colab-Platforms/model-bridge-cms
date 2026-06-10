import type z from "zod";

import {
  createProjectSchema,
  getAllProjectsQuerySchema,
  projectIdParamsSchema,
  updateProjectSchema,
} from "./projects.validators.js";

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type ProjectIdParams = z.infer<typeof projectIdParamsSchema>;
export type GetAllProjectsQuery = z.infer<typeof getAllProjectsQuerySchema>;
