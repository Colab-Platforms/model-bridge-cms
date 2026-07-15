import type {
  BillingCheckoutInput,
  BillingCheckoutResult,
  BillingCustomerInput,
  BillingCustomerResult,
  BillingWebhookEventEnvelope,
  BillingWebhookInput,
} from "../billing.types.js";
import type { BillingProviderName } from "../billing.constants.js";

export interface BillingProviderAdapter {
  readonly providerName: BillingProviderName;

  ensureCustomer(input: BillingCustomerInput): Promise<BillingCustomerResult>;
  createCheckout(input: BillingCheckoutInput): Promise<BillingCheckoutResult>;
  parseWebhook(input: BillingWebhookInput): Promise<BillingWebhookEventEnvelope>;
  getInvoiceUrl(transactionId: string): Promise<string | null>;
}
