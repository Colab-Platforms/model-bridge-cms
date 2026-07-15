import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
  createCheckoutController,
  getInvoiceByPaymentIdController,
  getInvoicesController,
  getPaymentsController,
  webhookController,
} from "./billing.controller.js";
import {
  billingPaymentIdParamsValidator,
  billingInvoicesQueryValidator,
  billingPaymentsQueryValidator,
  createCheckoutValidator,
} from "./billing.validators.js";

const router = Router();

router.post(
  "/create-checkout",
  auth("USER", "ADMIN", "SUPERADMIN"),
  createCheckoutValidator,
  createCheckoutController
);
router.post("/webhook", webhookController);
router.get(
  "/payments",
  auth("USER", "ADMIN", "SUPERADMIN"),
  billingPaymentsQueryValidator,
  getPaymentsController
);
router.get(
  "/invoices",
  auth("USER", "ADMIN", "SUPERADMIN"),
  billingInvoicesQueryValidator,
  getInvoicesController
);
router.get(
  "/payment/:id",
  auth("USER", "ADMIN", "SUPERADMIN"),
  billingPaymentIdParamsValidator,
  getInvoiceByPaymentIdController
);

export default router;
