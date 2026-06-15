import type z from "zod";

import { getOverviewQuerySchema } from "./overview.validators.js";

export type OverviewActor = {
  id: string;
  roles: string[];
};

export type GetOverviewQuery = z.infer<typeof getOverviewQuerySchema>;
