import {
  BillingProvider,
  BillingWebhookStatus,
  InvoiceStatus,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

import prisma from "../../../prisma.js";
import { addBalanceInTransaction, createWallet } from "../wallets/wallets.service.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../utils/paginationUtils.js";
import {
  BILLING_PROVIDER_NAME,
  BILLING_SUPPORTED_WEBHOOK_EVENTS,
  DEFAULT_BILLING_CURRENCY,
} from "./billing.constants.js";
import { generateAndUploadInvoice } from "./invoice-template.service.js";
import {
  formatInvoiceRecord,
  formatPaymentRecord,
  formatWebhookResult,
} from "./billing.mapper.js";
import { createBillingProviderFactory } from "./providers/billing-provider.factory.js";
import type {
  BillingActor,
  BillingInvoicesQuery,
  BillingPaymentsQuery,
  BillingWebhookInput,
  CreateCheckoutInput,
} from "./billing.types.js";
import {
  BillingDuplicateWebhookError,
  BillingSignatureError,
  BillingValidationError,
  assertSupportedCurrency,
  assertWithinBillingAmountRange,
  ensureBillingWebhookSecretsConfigured,
  extractSignatureTimestamp,
  getBillingAmountMinorUnit,
  getErrorMessage,
  getWebhookReplayWindowMs,
  hashPayload,
} from "./billing.utils.js";

const billingProviderFactory = createBillingProviderFactory({
  logger: console,
});

const ADMIN_ROLES = new Set(["Admin", "SuperAdmin"]);

const isAdminActor = (actor: BillingActor) =>
  actor.roles.some((role) => ADMIN_ROLES.has(role));

const formatDecimalValue = (value: Prisma.Decimal | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toFixed(value.decimalPlaces());
};

const buildDisplayName = (user: {
  firstName: string | null;
  lastName: string | null;
  email: string;
}) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email;
};

export class BillingService {
  async getPayments(actor: BillingActor, query: BillingPaymentsQuery) {
    const { take, skip, page, pageSize } = getPaginationOptions(query, 20);
    const effectiveUserId = isAdminActor(actor) ? query.userId : actor.id;

    const where: Prisma.PaymentWhereInput = {
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider ? { provider: query.provider } : {}),
    };

    const [payments, totalRecords] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take,
        skip,
      }),
      prisma.payment.count({ where }),
    ]);

    return formatPaginationResponse(
      payments.map((payment) => ({
        ...formatPaymentRecord(payment),
        invoice: payment.invoice ? formatInvoiceRecord(payment.invoice) : null,
      })),
      totalRecords,
      page,
      pageSize
    );
  }

  async getInvoices(actor: BillingActor, query: BillingInvoicesQuery) {
    const { take, skip, page, pageSize } = getPaginationOptions(query, 20);
    const effectiveUserId = isAdminActor(actor) ? query.userId : actor.id;

    const where: Prisma.InvoiceWhereInput = {
      ...(effectiveUserId ? { userId: effectiveUserId } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.provider
        ? {
            payment: {
              provider: query.provider,
            },
          }
        : {}),
    };

    const [invoices, totalRecords] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          payment: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take,
        skip,
      }),
      prisma.invoice.count({ where }),
    ]);

    return formatPaginationResponse(
      invoices.map((invoice) => ({
        ...formatInvoiceRecord(invoice),
        payment: formatPaymentRecord(invoice.payment),
      })),
      totalRecords,
      page,
      pageSize
    );
  }

  async getPaymentById(actor: BillingActor, paymentId: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        ...(isAdminActor(actor) ? {} : { userId: actor.id }),
      },
      include: {
        invoice: true,
      },
    });

    if (!payment) {
      throw new BillingValidationError("Payment not found");
    }

    return {
      ...formatPaymentRecord(payment),
      invoice: payment.invoice ? formatInvoiceRecord(payment.invoice) : null,
    };
  }

  async createCheckout(userId: string, input: CreateCheckoutInput) {
    const amount = assertWithinBillingAmountRange(input.amount);
    const currency = assertSupportedCurrency(input.currency ?? DEFAULT_BILLING_CURRENCY);

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isDeleted: false,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        paddleCustomerId: true,
      },
    });

    if (!user) {
      throw new BillingValidationError("User not found");
    }

    const wallet = await createWallet(userId, userId);
    const provider = billingProviderFactory.get(BILLING_PROVIDER_NAME);

    const ensuredCustomer = await provider.ensureCustomer({
      email: user.email,
      name: buildDisplayName(user),
      providerCustomerId: user.paddleCustomerId,
      externalUserId: user.id,
    });

    if (!user.paddleCustomerId || user.paddleCustomerId !== ensuredCustomer.customerId) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          paddleCustomerId: ensuredCustomer.customerId,
        },
      });
    }

    const checkout = await provider.createCheckout({
      customerId: ensuredCustomer.customerId,
      amountDecimal: amount.toFixed(2),
      amountMinorUnit: getBillingAmountMinorUnit(amount),
      currency,
      userId: user.id,
      metadata: {
        userId: user.id,
        walletId: wallet.id,
        topupAmount: amount.toFixed(2),
        currency,
      },
    });

    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        provider: BillingProvider.PADDLE,
        providerTransactionId: checkout.providerTransactionId,
        providerCustomerId: checkout.providerCustomerId,
        amount,
        currency,
        status: PaymentStatus.PENDING,
        metadata: checkout.metadata as Prisma.InputJsonValue | undefined,
      },
    });

    console.log("[billing] checkout created", {
      userId: user.id,
      paymentId: payment.id,
      provider: BILLING_PROVIDER_NAME,
      providerTransactionId: checkout.providerTransactionId,
    });

    return {
      checkoutUrl: checkout.checkoutUrl,
      payment: formatPaymentRecord(payment),
    };
  }

  async handleWebhook(input: BillingWebhookInput) {
    ensureBillingWebhookSecretsConfigured();

    if (!input.signature || !input.rawBody) {
      throw new BillingSignatureError("Missing Paddle webhook signature or raw payload");
    }

    const timestamp = extractSignatureTimestamp(input.signature);
    const replayWindowMs = getWebhookReplayWindowMs();

    if (Math.abs(Date.now() - timestamp * 1000) > replayWindowMs) {
      throw new BillingSignatureError("Webhook timestamp is outside the allowed replay window");
    }

    const provider = billingProviderFactory.get(BILLING_PROVIDER_NAME);

    console.log("[billing] webhook received", {
      provider: BILLING_PROVIDER_NAME,
      payloadHash: hashPayload(input.rawBody),
    });

    const event = await provider.parseWebhook({
      signature: input.signature,
      rawBody: input.rawBody,
    });

    console.log("[billing] webhook verified", {
      eventId: event.eventId,
      notificationId: event.notificationId,
      eventType: event.eventType,
    });

    if (!BILLING_SUPPORTED_WEBHOOK_EVENTS.has(event.eventType)) {
      console.log("[billing] webhook ignored", {
        eventId: event.eventId,
        notificationId: event.notificationId,
        eventType: event.eventType,
      });

      return formatWebhookResult("ignored", event.eventType, event.eventId);
    }

    let webhookEvent = await prisma.billingWebhookEvent.findUnique({
      where: {
        providerEventId: event.eventId,
      },
    });

    if (webhookEvent?.status === BillingWebhookStatus.PROCESSED) {
      console.log("[billing] duplicate webhook ignored", {
        eventId: event.eventId,
        notificationId: event.notificationId,
      });

      return formatWebhookResult("duplicate", event.eventType, event.eventId);
    }

    if (!webhookEvent) {
      try {
        webhookEvent = await prisma.billingWebhookEvent.create({
          data: {
            provider: BillingProvider.PADDLE,
            providerEventId: event.eventId,
            providerNotificationId: event.notificationId,
            eventType: event.eventType,
            signature: input.signature,
            payloadHash: hashPayload(input.rawBody),
            rawBody: input.rawBody,
            status: BillingWebhookStatus.RECEIVED,
          },
        });
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code?: string }).code === "P2002"
        ) {
          throw new BillingDuplicateWebhookError("Webhook event already received");
        }

        throw error;
      }
    }

    if (event.eventType !== "transaction.completed") {
      await prisma.billingWebhookEvent.update({
        where: {
          id: webhookEvent.id,
        },
        data: {
          status: BillingWebhookStatus.IGNORED,
          processedAt: new Date(),
          errorMessage: `TODO: ${event.eventType} handler not implemented`,
        },
      });

      return formatWebhookResult("ignored", event.eventType, event.eventId);
    }

    try {
      const invoiceUrl = await provider.getInvoiceUrl(event.transactionId);
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findUnique({
          where: {
            providerTransactionId: event.transactionId,
          },
          include: {
            invoice: true,
          },
        });

        if (!payment) {
          throw new BillingValidationError("Payment not found for completed transaction");
        }

        if (payment.status === PaymentStatus.COMPLETED) {
          await tx.billingWebhookEvent.update({
            where: {
              id: webhookEvent.id,
            },
            data: {
              userId: payment.userId,
              status: BillingWebhookStatus.PROCESSED,
              processedAt: new Date(),
            },
          });

          return {
            payment,
            invoice: payment.invoice,
            duplicate: true,
          };
        }

        await addBalanceInTransaction(
          {
            userId: payment.userId,
            amount: payment.amount,
            createdBy: payment.userId,
            referenceId: payment.providerTransactionId,
            description: "Wallet top-up via billing provider",
          },
          tx
        );

        console.log("[billing] wallet credited", {
          paymentId: payment.id,
          userId: payment.userId,
          providerTransactionId: payment.providerTransactionId,
        });

        await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            status: PaymentStatus.COMPLETED,
            metadata: event.metadata as Prisma.InputJsonValue | undefined,
          },
        });

        const invoiceNumber =
          event.invoice.invoiceNumber ?? `MB-${new Date().toISOString().slice(0, 10)}-${payment.id.slice(-6).toUpperCase()}`;

        const invoice = await tx.invoice.upsert({
          where: {
            paymentId: payment.id,
          },
          update: {
            providerInvoiceId: event.invoice.providerInvoiceId,
            invoiceNumber,
            invoiceUrl: invoiceUrl ?? event.invoice.invoiceUrl,
            amount: payment.amount,
            currency: payment.currency,
            status: InvoiceStatus.PAID,
          },
          create: {
            paymentId: payment.id,
            userId: payment.userId,
            providerInvoiceId: event.invoice.providerInvoiceId,
            invoiceNumber,
            invoiceUrl: invoiceUrl ?? event.invoice.invoiceUrl,
            amount: payment.amount,
            currency: payment.currency,
            status: InvoiceStatus.PAID,
          },
        });

        console.log("[billing] invoice stored", {
          paymentId: payment.id,
          invoiceId: invoice.id,
          providerInvoiceId: invoice.providerInvoiceId,
        });

        const paymentWithInvoiceId = await tx.payment.update({
          where: {
            id: payment.id,
          },
          data: {
            invoiceId: invoice.id,
          },
        });

        await tx.billingWebhookEvent.update({
          where: {
            id: webhookEvent.id,
          },
          data: {
            userId: payment.userId,
            status: BillingWebhookStatus.PROCESSED,
            processedAt: new Date(),
          },
        });

        console.log("[billing] payment success", {
          paymentId: payment.id,
          eventId: event.eventId,
        });

        return {
          payment: paymentWithInvoiceId,
          invoice,
          amount: payment.amount,
          duplicate: false,
        };
      });

      if (!result.duplicate && result.invoice) {
        try {
          const paymentUser = await prisma.user.findFirst({
            where: {
              id: result.payment.userId,
              isDeleted: false,
            },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          });

          if (paymentUser) {
            const formattedAmount = formatDecimalValue(result.amount) ?? "0";
            const customInvoiceUrl = await generateAndUploadInvoice({
              paymentId: result.payment.id,
              invoiceNumber: result.invoice.invoiceNumber ?? result.invoice.id,
              invoiceDate: result.invoice.createdAt.toISOString().slice(0, 10),
              invoiceStatus: result.invoice.status,
              paymentReference: result.payment.providerTransactionId,
              customerName: buildDisplayName(paymentUser),
              customerEmail: paymentUser.email,
              userId: paymentUser.id,
              providerName: result.payment.provider,
              currency: result.invoice.currency,
              formattedAmount,
              itemDescription: "Model Bridge wallet top-up credits",
            });

            if (customInvoiceUrl) {
              await prisma.invoice.update({
                where: {
                  id: result.invoice.id,
                },
                data: {
                  invoiceUrl: customInvoiceUrl,
                },
              });

              result.invoice.invoiceUrl = customInvoiceUrl;
            }
          }
        } catch (error: unknown) {
          console.error("[billing] custom invoice generation failed", {
            invoiceId: result.invoice.id,
            paymentId: result.payment.id,
            message: getErrorMessage(error),
          });
        }
      }

      return {
        eventId: event.eventId,
        eventType: event.eventType,
        status: result.duplicate ? "duplicate" : "processed",
        payment: formatPaymentRecord(result.payment),
        invoice: result.invoice ? formatInvoiceRecord(result.invoice) : null,
      };
    } catch (error: unknown) {
      await prisma.billingWebhookEvent.update({
        where: {
          id: webhookEvent.id,
        },
        data: {
          status: BillingWebhookStatus.FAILED,
          errorMessage: getErrorMessage(error),
        },
      });

      throw error;
    }
  }
}

export const billingService = new BillingService();
