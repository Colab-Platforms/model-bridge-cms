import type z from "zod";

import type { AdminActor } from "../admin.types.js";
import { getAdminOverviewQuerySchema } from "./overview.validators.js";

export type AdminOverviewActor = AdminActor;
export type GetAdminOverviewQuery = z.infer<typeof getAdminOverviewQuerySchema>;
