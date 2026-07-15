import type z from "zod";

import type {
  BillingProvider,
  BillingWebhookEvent,
  Invoice,
  Payment,
} from "@prisma/client";
import type {
  billingInvoicesQuerySchema,
  billingPaymentIdParamsSchema,
  billingPaymentsQuerySchema,
  createCheckoutSchema,
} from "./billing.validators.js";

export type CreateCheckoutInput = z.infer<typeof createCheckoutSchema>;
export type BillingPaymentIdParams = z.infer<typeof billingPaymentIdParamsSchema>;
export type BillingPaymentsQuery = z.infer<typeof billingPaymentsQuerySchema>;
export type BillingInvoicesQuery = z.infer<typeof billingInvoicesQuerySchema>;

export interface BillingProviderLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export interface BillingFactoryDependencies {
  logger?: BillingProviderLogger;
}

export interface BillingCustomerInput {
  email: string;
  name?: string;
  providerCustomerId?: string | null;
  externalUserId: string;
}

export interface BillingCustomerResult {
  customerId: string;
}

export interface BillingCheckoutInput {
  customerId: string;
  amountDecimal: string;
  amountMinorUnit: string;
  currency: string;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface BillingCheckoutResult {
  providerTransactionId: string;
  providerCustomerId: string;
  checkoutUrl: string;
  metadata?: Record<string, unknown> | null;
}

export interface BillingWebhookInput {
  signature: string;
  rawBody: string;
}

export interface BillingWebhookEventEnvelope {
  eventId: string;
  notificationId: string | null;
  eventType: string;
  occurredAt: string;
  transactionId: string;
  status: string;
  customerId: string | null;
  invoice: {
    providerInvoiceId: string | null;
    invoiceNumber: string | null;
    providerInvoiceUrl: string | null;
    invoiceUrl: string | null;
  };
  metadata?: Record<string, unknown> | null;
}

export interface BillingActor {
  id: string;
  roles: string[];
}

export interface FormattedPayment extends Omit<Payment, "amount"> {
  amount: string;
}

export interface FormattedInvoice extends Omit<Invoice, "amount"> {
  amount: string;
}

export interface FormattedBillingWebhookEvent
  extends Omit<BillingWebhookEvent, "provider" | "status"> {
  provider: BillingProvider;
  status: BillingWebhookEvent["status"];
}
