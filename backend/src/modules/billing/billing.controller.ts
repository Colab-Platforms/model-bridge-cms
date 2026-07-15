import { Request, Response } from "express";

import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { billingService } from "./billing.service.js";
import type {
  BillingInvoicesQuery,
  BillingPaymentIdParams,
  BillingPaymentsQuery,
  CreateCheckoutInput,
} from "./billing.types.js";

const getActorId = (req: Request) =>
  (req as Request & { user?: { id?: string } }).user?.id as string | undefined;

export const createCheckoutController = async (req: Request, res: Response) => {
  const actorId = getActorId(req) as string;
  const result = await billingService.createCheckout(actorId, req.body as CreateCheckoutInput);

  return sendResponse(res, true, result, "Checkout created successfully", STATUS_CODES.CREATED);
};

export const webhookController = async (req: Request, res: Response) => {
  const signature = req.headers["paddle-signature"];
  const rawBody = (req as Request & { rawBody?: string }).rawBody ?? "";

  const result = await billingService.handleWebhook({
    signature: typeof signature === "string" ? signature : "",
    rawBody,
  });

  return sendResponse(res, true, result, "Webhook processed successfully", STATUS_CODES.OK);
};

export const getPaymentsController = async (req: Request, res: Response) => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;
  const result = await billingService.getPayments(
    {
      id: actor?.id as string,
      roles: actor?.roles ?? [],
    },
    req.query as BillingPaymentsQuery
  );

  return sendResponse(res, true, result, "Payments fetched successfully", STATUS_CODES.OK);
};

export const getInvoicesController = async (req: Request, res: Response) => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;
  const result = await billingService.getInvoices(
    {
      id: actor?.id as string,
      roles: actor?.roles ?? [],
    },
    req.query as BillingInvoicesQuery
  );

  return sendResponse(res, true, result, "Invoices fetched successfully", STATUS_CODES.OK);
};

export const getInvoiceByPaymentIdController = async (req: Request, res: Response) => {
  const actor = (req as Request & { user?: { id?: string; roles?: string[] } }).user;
  const result = await billingService.getPaymentById(
    {
      id: actor?.id as string,
      roles: actor?.roles ?? [],
    },
    (req.params as BillingPaymentIdParams).id
  );

  return sendResponse(res, true, result, "Payment fetched successfully", STATUS_CODES.OK);
};
