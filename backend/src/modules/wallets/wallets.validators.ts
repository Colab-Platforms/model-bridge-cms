import { z } from "zod";

import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../shared/middlewares/validate.js";

const amountSchema = z.union([z.number().positive(), z.string().trim().min(1)]);

export const walletUserIdParamsSchema = z.object({
  userId: z.string().trim().min(1),
});

export const walletTransactionsQuerySchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const addBalanceSchema = z.object({
  userId: z.string().trim().min(1),
  amount: amountSchema,
  description: z.string().trim().min(1).optional(),
  createdBy: z.string().trim().min(1).optional(),
  referenceId: z.string().trim().min(1).optional(),
});

export const addOwnBalanceSchema = z.object({
  amount: amountSchema,
  description: z.string().trim().min(1).optional(),
  createdBy: z.string().trim().min(1).optional(),
  referenceId: z.string().trim().min(1).optional(),
});

export const deductBalanceSchema = z.object({
  userId: z.string().trim().min(1),
  amount: amountSchema,
  description: z.string().trim().min(1).optional(),
  createdBy: z.string().trim().min(1).optional(),
  referenceId: z.string().trim().min(1).optional(),
  inferenceRequestId: z.string().trim().min(1).optional(),
});

export const refundBalanceSchema = z.object({
  userId: z.string().trim().min(1),
  amount: amountSchema,
  description: z.string().trim().min(1).optional(),
  createdBy: z.string().trim().min(1).optional(),
  referenceId: z.string().trim().min(1).optional(),
  inferenceRequestId: z.string().trim().min(1).optional(),
});

export const createWalletSchema = z.object({
  userId: z.string().trim().min(1),
});

export const walletStatusBodySchema = z.object({
  userId: z.string().trim().min(1),
});

export const walletUserIdParamsValidator = validateParams(walletUserIdParamsSchema);
export const walletTransactionsQueryValidator = validateQuery(walletTransactionsQuerySchema);
export const addBalanceValidator = validateBody(addBalanceSchema);
export const addOwnBalanceValidator = validateBody(addOwnBalanceSchema);
export const deductBalanceValidator = validateBody(deductBalanceSchema);
export const refundBalanceValidator = validateBody(refundBalanceSchema);
export const createWalletValidator = validateBody(createWalletSchema);
export const walletStatusBodyValidator = validateBody(walletStatusBodySchema);
