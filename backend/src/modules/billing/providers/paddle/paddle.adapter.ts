import type {
  CurrencyCode,
  CreateCustomerRequestBody,
  CreateTransactionRequestBody,
  TransactionNotification,
} from "@paddle/paddle-node-sdk";

import type {
  BillingCheckoutInput,
  BillingCheckoutResult,
  BillingCustomerInput,
  BillingCustomerResult,
  BillingWebhookEventEnvelope,
  BillingWebhookInput,
} from "../../billing.types.js";
import { BillingValidationError } from "../../billing.utils.js";
import type { BillingProviderAdapter } from "../billing-provider.interface.js";
import { mapPaddleTransactionToCheckoutResult } from "./paddle.mapper.js";
import { normalizePaddleWebhookEvent } from "./paddle.webhook.js";
import { PaddleClient } from "./paddle.client.js";

export class PaddleAdapter implements BillingProviderAdapter {
  readonly providerName = "PADDLE" as const;

  constructor(private readonly client: PaddleClient) {}

  async ensureCustomer(input: BillingCustomerInput): Promise<BillingCustomerResult> {
    if (input.providerCustomerId) {
      return {
        customerId: input.providerCustomerId,
      };
    }

    const requestBody: CreateCustomerRequestBody = {
      email: input.email,
      name: input.name ?? input.email,
      customData: {
        externalUserId: input.externalUserId,
      },
    };

    const customer = await this.client.createCustomer(requestBody);

    return {
      customerId: customer.id,
    };
  }

  async createCheckout(input: BillingCheckoutInput): Promise<BillingCheckoutResult> {
    const currencyCode = input.currency as CurrencyCode;

    const requestBody: CreateTransactionRequestBody = {
      customerId: input.customerId,
      currencyCode,
      collectionMode: "automatic",
      items: [
        {
          quantity: 1,
          price: {
            name: "Model Bridge Credits",
            description: `Wallet top-up of ${input.amountDecimal} ${input.currency}`,
            unitPrice: {
              amount: input.amountMinorUnit,
              currencyCode,
            },
            product: {
              name: "Model Bridge Wallet Credits",
              description: "Prepaid credits for Model Bridge AI usage",
              taxCategory: "saas",
            },
            taxMode: "account_setting",
            customData: input.metadata ?? null,
          },
        },
      ],
      checkout: {},
      customData: input.metadata ?? null,
    };

    const transaction = await this.client.createTransaction(requestBody);
    const result = mapPaddleTransactionToCheckoutResult(
      transaction as unknown as TransactionNotification
    );

    if (!result.checkoutUrl) {
      throw new BillingValidationError("Paddle checkout URL was not returned");
    }

    return result;
  }

  async parseWebhook(input: BillingWebhookInput): Promise<BillingWebhookEventEnvelope> {
    const event = await this.client.unmarshalWebhook(input.rawBody, input.signature);
    return normalizePaddleWebhookEvent(event);
  }

  async getInvoiceUrl(transactionId: string): Promise<string | null> {
    const invoicePdf = await this.client.getTransactionInvoicePdf(transactionId);
    return invoicePdf?.url ?? null;
  }
}
