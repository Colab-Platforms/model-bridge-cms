import type z from "zod";

import {
  createProviderSchema,
  providerIdParamsSchema,
  providerListQuerySchema,
  updateProviderSchema,
} from "./providers.validators.js";

export type CreateProviderInput = z.infer<typeof createProviderSchema>;
export type UpdateProviderInput = z.infer<typeof updateProviderSchema>;
export type ProviderIdParams = z.infer<typeof providerIdParamsSchema>;
export type ProviderListQuery = z.infer<typeof providerListQuerySchema>;
