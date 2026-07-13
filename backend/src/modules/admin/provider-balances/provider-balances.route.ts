import { Router } from "express";

import auth from "../../../shared/middlewares/auth.js";
import {
  adjustProviderBalanceController,
  getProviderBalanceByIdController,
  getProviderBalanceLedgerController,
  getProviderBalancesController,
  rechargeProviderBalanceController,
  updateProviderBalanceSettingsController,
} from "./provider-balances.controller.js";
import {
  providerBalanceAdjustBodyValidator,
  providerBalanceIdParamsValidator,
  providerBalanceLedgerQueryValidator,
  providerBalanceRechargeBodyValidator,
  providerBalanceSettingsBodyValidator,
  providerBalancesListQueryValidator,
} from "./provider-balances.validators.js";

const router = Router();

router.get(
  "/",
  auth("ADMIN", "SUPERADMIN"),
  providerBalancesListQueryValidator,
  getProviderBalancesController
);
router.get(
  "/:providerId",
  auth("ADMIN", "SUPERADMIN"),
  providerBalanceIdParamsValidator,
  getProviderBalanceByIdController
);
router.get(
  "/:providerId/ledger",
  auth("ADMIN", "SUPERADMIN"),
  providerBalanceIdParamsValidator,
  providerBalanceLedgerQueryValidator,
  getProviderBalanceLedgerController
);
router.post(
  "/:providerId/recharge",
  auth("ADMIN", "SUPERADMIN"),
  providerBalanceIdParamsValidator,
  providerBalanceRechargeBodyValidator,
  rechargeProviderBalanceController
);
router.post(
  "/:providerId/adjust",
  auth("ADMIN", "SUPERADMIN"),
  providerBalanceIdParamsValidator,
  providerBalanceAdjustBodyValidator,
  adjustProviderBalanceController
);
router.patch(
  "/:providerId/settings",
  auth("ADMIN", "SUPERADMIN"),
  providerBalanceIdParamsValidator,
  providerBalanceSettingsBodyValidator,
  updateProviderBalanceSettingsController
);

export default router;
