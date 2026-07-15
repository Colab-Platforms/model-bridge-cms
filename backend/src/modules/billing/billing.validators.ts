import { BillingProvider, InvoiceStatus, PaymentStatus } from "@prisma/client";
import { z } from "zod";

import { validateBody, validateParams, validateQuery } from "../../shared/middlewares/validate.js";
import {
  BILLING_MAX_AMOUNT,
  BILLING_MIN_AMOUNT,
  DEFAULT_BILLING_CURRENCY,
  SUPPORTED_BILLING_CURRENCIES,
} from "./billing.constants.js";

const decimalValueSchema = z.union([z.number(), z.string().trim().min(1)]);

export const createCheckoutSchema = z.object({
  amount: decimalValueSchema,
  currency: z
    .string()
    .trim()
    .toUpperCase()
    .default(DEFAULT_BILLING_CURRENCY)
    .refine((value) => SUPPORTED_BILLING_CURRENCIES.includes(value), {
      message: `Supported currencies: ${SUPPORTED_BILLING_CURRENCIES.join(", ")}`,
    }),
}).superRefine((value, ctx) => {
  const amount = Number(value.amount);

  if (Number.isNaN(amount)) {
    ctx.addIssue({
      code: "custom",
      message: "Amount must be a valid number",
      path: ["amount"],
    });
    return;
  }

  if (amount < BILLING_MIN_AMOUNT) {
    ctx.addIssue({
      code: "custom",
      message: `Minimum top-up amount is ${BILLING_MIN_AMOUNT}`,
      path: ["amount"],
    });
  }

  if (amount > BILLING_MAX_AMOUNT) {
    ctx.addIssue({
      code: "custom",
      message: `Maximum top-up amount is ${BILLING_MAX_AMOUNT}`,
      path: ["amount"],
    });
  }
});

export const billingPaymentIdParamsSchema = z.object({
  id: z.string().trim().min(1),
});

export const billingPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(PaymentStatus).optional(),
  provider: z.nativeEnum(BillingProvider).optional(),
  userId: z.string().trim().min(1).optional(),
});

export const billingInvoicesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  pageSize: z.coerce.number().int().positive().max(100).optional(),
  status: z.nativeEnum(InvoiceStatus).optional(),
  provider: z.nativeEnum(BillingProvider).optional(),
  userId: z.string().trim().min(1).optional(),
});

export const createCheckoutValidator = validateBody(createCheckoutSchema);
export const billingPaymentIdParamsValidator = validateParams(billingPaymentIdParamsSchema);
export const billingPaymentsQueryValidator = validateQuery(billingPaymentsQuerySchema);
export const billingInvoicesQueryValidator = validateQuery(billingInvoicesQuerySchema);
