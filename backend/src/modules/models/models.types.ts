import type z from "zod";

import { getAllModelsQuerySchema, modelIdParamsSchema } from "./models.validators.js";

export type GetAllModelsQuery = z.infer<typeof getAllModelsQuerySchema>;
export type ModelIdParams = z.infer<typeof modelIdParamsSchema>;
