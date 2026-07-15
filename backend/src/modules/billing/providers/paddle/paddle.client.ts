import {
  Environment,
  Paddle,
  type CreateCustomerRequestBody,
  type CreateTransactionRequestBody,
  type EventEntity,
} from "@paddle/paddle-node-sdk";

import type { BillingProviderLogger } from "../../billing.types.js";
import {
  BillingConfigurationError,
  BillingError,
  BillingSignatureError,
} from "../../billing.utils.js";

const defaultLogger: BillingProviderLogger = {
  info: (message, meta) => console.info(message, meta),
  warn: (message, meta) => console.warn(message, meta),
  error: (message, meta) => console.error(message, meta),
};

const resolveEnvironment = () => {
  const environment = process.env.PADDLE_ENV?.trim().toUpperCase();
  return environment === "PRODUCTION" ? Environment.production : Environment.sandbox;
};

export class PaddleClient {
  private readonly sdk: Paddle;
  private readonly logger: BillingProviderLogger;

  constructor(logger?: BillingProviderLogger) {
    const apiKey = process.env.PADDLE_API_KEY;

    if (!apiKey) {
      throw new BillingConfigurationError("Missing required environment variable: PADDLE_API_KEY");
    }

    this.sdk = new Paddle(apiKey, {
      environment: resolveEnvironment(),
    });
    this.logger = logger ?? defaultLogger;
  }

  async createCustomer(input: CreateCustomerRequestBody) {
    try {
      this.logger.info("[billing:paddle] creating customer", {
        email: input.email,
      });

      return await this.sdk.customers.create(input);
    } catch (error: unknown) {
      this.logger.error("[billing:paddle] customer creation failed", {
        message: error instanceof Error ? error.message : "Unknown Paddle error",
      });
      throw new BillingError("Failed to create Paddle customer");
    }
  }

  async createTransaction(input: CreateTransactionRequestBody) {
    try {
      this.logger.info("[billing:paddle] creating transaction", {
        customerId: input.customerId,
        currencyCode: input.currencyCode,
      });

      return await this.sdk.transactions.create(input);
    } catch (error: unknown) {
      this.logger.error("[billing:paddle] transaction creation failed", {
        message: error instanceof Error ? error.message : "Unknown Paddle error",
      });
      throw new BillingError("Failed to create Paddle checkout transaction");
    }
  }

  async getTransactionInvoicePdf(transactionId: string) {
    try {
      return await this.sdk.transactions.getInvoicePDF(transactionId);
    } catch (error: unknown) {
      this.logger.warn("[billing:paddle] invoice pdf lookup failed", {
        transactionId,
        message: error instanceof Error ? error.message : "Unknown Paddle error",
      });
      return null;
    }
  }

  async unmarshalWebhook(rawBody: string, signature: string): Promise<EventEntity> {
    const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new BillingConfigurationError(
        "Missing required environment variable: PADDLE_WEBHOOK_SECRET"
      );
    }

    try {
      return await this.sdk.webhooks.unmarshal(rawBody, webhookSecret, signature);
    } catch (error: unknown) {
      this.logger.warn("[billing:paddle] webhook verification failed", {
        message: error instanceof Error ? error.message : "Unknown Paddle error",
      });
      throw new BillingSignatureError("Invalid Paddle webhook signature");
    }
  }
}
