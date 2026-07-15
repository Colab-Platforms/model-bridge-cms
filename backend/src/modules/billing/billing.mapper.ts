import { Prisma } from "@prisma/client";

const formatDecimalValue = (value: Prisma.Decimal | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toFixed(value.decimalPlaces());
};

export const formatPaymentRecord = <
  T extends {
    amount: Prisma.Decimal;
  },
>(
  payment: T
) => ({
  ...payment,
  amount: formatDecimalValue(payment.amount) ?? "0",
});

export const formatInvoiceRecord = <
  T extends {
    amount: Prisma.Decimal;
  },
>(
  invoice: T
) => ({
  ...invoice,
  amount: formatDecimalValue(invoice.amount) ?? "0",
});

export const formatWebhookResult = (
  status: "processed" | "duplicate" | "ignored",
  eventType: string,
  eventId: string
) => ({
  eventId,
  eventType,
  status,
});
