import {
  EventName,
  type EventEntity,
  type TransactionCompletedEvent,
} from "@paddle/paddle-node-sdk";

import type { BillingWebhookEventEnvelope } from "../../billing.types.js";
import {
  BillingNotImplementedError,
  BillingValidationError,
} from "../../billing.utils.js";
import {
  mapPaddleCompletedEvent,
  mapPaddleGenericTransactionEvent,
} from "./paddle.mapper.js";

const isTransactionEvent = (event: EventEntity): event is EventEntity & { data: { id: string } } =>
  Boolean((event as { data?: { id?: string } }).data?.id);

export const normalizePaddleWebhookEvent = (event: EventEntity): BillingWebhookEventEnvelope => {
  switch (event.eventType) {
    case EventName.TransactionCompleted:
      return mapPaddleCompletedEvent(event as TransactionCompletedEvent);
    case EventName.TransactionUpdated:
    case EventName.TransactionCanceled:
    case EventName.TransactionPaymentFailed:
      if (!isTransactionEvent(event)) {
        throw new BillingValidationError("Transaction webhook payload is missing transaction data");
      }

      return mapPaddleGenericTransactionEvent(event as never);
    case EventName.SubscriptionCreated:
    case EventName.SubscriptionUpdated:
    case EventName.SubscriptionCanceled:
    case EventName.AdjustmentCreated:
      return {
        eventId: event.eventId,
        notificationId: event.notificationId,
        eventType: event.eventType,
        occurredAt: event.occurredAt,
        transactionId: "",
        status: "todo",
        customerId: null,
        invoice: {
          providerInvoiceId: null,
          invoiceNumber: null,
          invoiceUrl: null,
        },
        metadata: null,
      };
    default:
      throw new BillingNotImplementedError(`Unhandled Paddle event type: ${event.eventType}`);
  }
};
