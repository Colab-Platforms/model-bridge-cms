import { z } from "zod";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../../shared/middlewares/validate.js";

const decimalValueSchema = z.union([z.number(), z.string().trim().min(1)]);

export const providerBalanceIdParamsSchema = z.object({
  providerId: z.string().trim().min(1),
});

export const providerBalancesListQuerySchema = z.object({
  slug: z.string().trim().min(1).optional(),
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  lowBalanceOnly: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const providerBalanceLedgerQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const providerBalanceRechargeBodySchema = z.object({
  amount: decimalValueSchema,
  description: z.string().trim().min(1).optional(),
  referenceId: z.string().trim().min(1).optional(),
});

export const providerBalanceAdjustBodySchema = z.object({
  amount: decimalValueSchema,
  description: z.string().trim().min(1).optional(),
  referenceId: z.string().trim().min(1).optional(),
});

export const providerBalanceSettingsBodySchema = z
  .object({
    lowBalanceThreshold: decimalValueSchema.optional(),
    alertsEnabled: z.boolean().optional(),
    currency: z.string().trim().min(1).max(10).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one field is required for update",
  });

export const providerBalanceIdParamsValidator = validateParams(providerBalanceIdParamsSchema);
export const providerBalancesListQueryValidator = validateQuery(providerBalancesListQuerySchema);
export const providerBalanceLedgerQueryValidator = validateQuery(providerBalanceLedgerQuerySchema);
export const providerBalanceRechargeBodyValidator = validateBody(providerBalanceRechargeBodySchema);
export const providerBalanceAdjustBodyValidator = validateBody(providerBalanceAdjustBodySchema);
export const providerBalanceSettingsBodyValidator = validateBody(providerBalanceSettingsBodySchema);
