import type { CustomData, TransactionCompletedEvent, TransactionNotification } from "@paddle/paddle-node-sdk";

import type { BillingCheckoutResult, BillingWebhookEventEnvelope } from "../../billing.types.js";

const mapCustomData = (customData: CustomData | null | undefined) => {
  if (!customData || typeof customData !== "object") {
    return null;
  }

  return Object.fromEntries(
    Object.entries(customData).map(([key, value]) => [key, value as unknown])
  );
};

export const mapPaddleTransactionToCheckoutResult = (
  transaction: TransactionNotification
): BillingCheckoutResult => ({
  providerTransactionId: transaction.id,
  providerCustomerId: transaction.customerId ?? "",
  checkoutUrl: transaction.checkout?.url ?? "",
  metadata: mapCustomData(transaction.customData),
});

export const mapPaddleCompletedEvent = (
  event: TransactionCompletedEvent
): BillingWebhookEventEnvelope => ({
  eventId: event.eventId,
  notificationId: event.notificationId,
  eventType: event.eventType,
  occurredAt: event.occurredAt,
  transactionId: event.data.id,
  status: event.data.status,
  customerId: event.data.customerId,
  invoice: {
    providerInvoiceId: event.data.invoiceId,
    invoiceNumber: event.data.invoiceNumber,
    invoiceUrl: event.data.checkout?.url ?? null,
  },
  metadata: mapCustomData(event.data.customData),
});

export const mapPaddleGenericTransactionEvent = (
  event: {
    eventId: string;
    notificationId: string | null;
    eventType: string;
    occurredAt: string;
    data: TransactionNotification;
  }
): BillingWebhookEventEnvelope => ({
  eventId: event.eventId,
  notificationId: event.notificationId,
  eventType: event.eventType,
  occurredAt: event.occurredAt,
  transactionId: event.data.id,
  status: event.data.status,
  customerId: event.data.customerId,
  invoice: {
    providerInvoiceId: event.data.invoiceId,
    invoiceNumber: event.data.invoiceNumber,
    invoiceUrl: event.data.checkout?.url ?? null,
  },
  metadata: mapCustomData(event.data.customData),
});
