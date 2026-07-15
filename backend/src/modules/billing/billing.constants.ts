export const BILLING_PROVIDER_NAMES = ["PADDLE"] as const;

export type BillingProviderName = (typeof BILLING_PROVIDER_NAMES)[number];

export const BILLING_PROVIDER_NAME: BillingProviderName = "PADDLE";

export const DEFAULT_BILLING_CURRENCY = "USD";
export const SUPPORTED_BILLING_CURRENCIES = [DEFAULT_BILLING_CURRENCY];
export const BILLING_MIN_AMOUNT = 5;
export const BILLING_MAX_AMOUNT = 10000;
export const BILLING_WEBHOOK_TOLERANCE_MS = 5 * 60 * 1000;

export const BILLING_SUPPORTED_WEBHOOK_EVENTS = new Set([
  "transaction.completed",
  "transaction.updated",
  "transaction.canceled",
  "transaction.payment_failed",
  "payment.failed",
  "subscription.created",
  "subscription.updated",
  "subscription.canceled",
  "adjustment.created",
]);
