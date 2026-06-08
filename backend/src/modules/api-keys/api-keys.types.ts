import type z from "zod";

import {
  apiKeyIdParamsSchema,
  apiKeyProjectIdParamsSchema,
  apiKeyUserIdParamsSchema,
  createApiKeySchema,
  getAllApiKeysQuerySchema,
  updateApiKeySchema,
} from "./api-keys.validators.js";

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;
export type UpdateApiKeyInput = z.infer<typeof updateApiKeySchema>;
export type ApiKeyIdParams = z.infer<typeof apiKeyIdParamsSchema>;
export type ApiKeyProjectIdParams = z.infer<typeof apiKeyProjectIdParamsSchema>;
export type ApiKeyUserIdParams = z.infer<typeof apiKeyUserIdParamsSchema>;
export type GetAllApiKeysQuery = z.infer<typeof getAllApiKeysQuerySchema>;
