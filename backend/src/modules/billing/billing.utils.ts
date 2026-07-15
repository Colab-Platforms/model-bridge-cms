import crypto from "crypto";

import { Prisma } from "@prisma/client";

import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import {
  BILLING_MAX_AMOUNT,
  BILLING_MIN_AMOUNT,
  BILLING_WEBHOOK_TOLERANCE_MS,
  DEFAULT_BILLING_CURRENCY,
  SUPPORTED_BILLING_CURRENCIES,
} from "./billing.constants.js";

export class BillingError extends AppError {
  constructor(message: string, statusCode = STATUS_CODES.SERVER_ERROR, details?: unknown) {
    super(message, statusCode, details);
    this.name = "BillingError";
  }
}

export class BillingValidationError extends BillingError {
  constructor(message: string, details?: unknown) {
    super(message, STATUS_CODES.BAD_REQUEST, details);
    this.name = "BillingValidationError";
  }
}

export class BillingConfigurationError extends BillingError {
  constructor(message: string, details?: unknown) {
    super(message, STATUS_CODES.SERVER_ERROR, details);
    this.name = "BillingConfigurationError";
  }
}

export class BillingSignatureError extends BillingError {
  constructor(message: string, details?: unknown) {
    super(message, STATUS_CODES.UNAUTHORIZED, details);
    this.name = "BillingSignatureError";
  }
}

export class BillingReplayAttackError extends BillingError {
  constructor(message: string, details?: unknown) {
    super(message, STATUS_CODES.UNAUTHORIZED, details);
    this.name = "BillingReplayAttackError";
  }
}

export class BillingDuplicateWebhookError extends BillingError {
  constructor(message: string, details?: unknown) {
    super(message, STATUS_CODES.CONFLICT, details);
    this.name = "BillingDuplicateWebhookError";
  }
}

export class BillingNotImplementedError extends BillingError {
  constructor(message: string, details?: unknown) {
    super(message, STATUS_CODES.ACCEPTED, details);
    this.name = "BillingNotImplementedError";
  }
}

export const toDecimal = (amount: number | string | Prisma.Decimal) =>
  amount instanceof Prisma.Decimal ? amount : new Prisma.Decimal(amount);

export const assertWithinBillingAmountRange = (
  amount: number | string | Prisma.Decimal
) => {
  const decimalAmount = toDecimal(amount);

  if (decimalAmount.lt(BILLING_MIN_AMOUNT)) {
    throw new BillingValidationError(`Minimum top-up amount is ${BILLING_MIN_AMOUNT}`);
  }

  if (decimalAmount.gt(BILLING_MAX_AMOUNT)) {
    throw new BillingValidationError(`Maximum top-up amount is ${BILLING_MAX_AMOUNT}`);
  }

  return decimalAmount;
};

export const assertSupportedCurrency = (currency = DEFAULT_BILLING_CURRENCY) => {
  const normalizedCurrency = currency.trim().toUpperCase();

  if (!SUPPORTED_BILLING_CURRENCIES.includes(normalizedCurrency)) {
    throw new BillingValidationError(`Unsupported billing currency: ${normalizedCurrency}`);
  }

  return normalizedCurrency;
};

export const getBillingAmountMinorUnit = (amount: Prisma.Decimal) =>
  amount.mul(100).toDecimalPlaces(0).toFixed(0);

export const extractSignatureTimestamp = (signatureHeader: string) => {
  const timestampPart = signatureHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("ts="));

  if (!timestampPart) {
    throw new BillingSignatureError("Webhook timestamp missing from Paddle signature");
  }

  const timestamp = Number(timestampPart.slice(3));

  if (!Number.isFinite(timestamp)) {
    throw new BillingSignatureError("Invalid Paddle webhook timestamp");
  }

  return timestamp;
};

export const getWebhookReplayWindowMs = () => BILLING_WEBHOOK_TOLERANCE_MS;

export const hashPayload = (rawBody: string) =>
  crypto.createHash("sha256").update(rawBody).digest("hex");

export const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown billing error";
};

export const ensureBillingWebhookSecretsConfigured = () => {
  if (!process.env.PADDLE_WEBHOOK_SECRET) {
    throw new BillingConfigurationError(
      "Missing required environment variable: PADDLE_WEBHOOK_SECRET"
    );
  }
};
