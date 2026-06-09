import { Router } from "express";

import auth from "../../shared/middlewares/auth.js";
import {
  addBalanceController,
  addBalanceToMyWalletController,
  createWalletController,
  deductBalanceController,
  freezeWalletController,
  getMyWalletController,
  getWalletBalanceController,
  getWalletTransactionsController,
  refundBalanceController,
  unfreezeWalletController,
} from "./wallets.controller.js";
import {
  addBalanceValidator,
  addOwnBalanceValidator,
  deductBalanceValidator,
  refundBalanceValidator,
  walletStatusBodyValidator,
  walletTransactionsQueryValidator,
} from "./wallets.validators.js";

const router = Router();

router.post("/", auth("USER", "ADMIN", "SUPERADMIN"), createWalletController);
router.get("/me", auth("USER", "ADMIN", "SUPERADMIN"), getMyWalletController);
router.get(
  "/balance",
  auth("USER", "ADMIN", "SUPERADMIN"),
  getWalletBalanceController
);
router.get(
  "/transactions",
  auth("USER", "ADMIN", "SUPERADMIN"),
  walletTransactionsQueryValidator,
  getWalletTransactionsController
);
router.post(
  "/me/add-balance",
  auth("USER", "ADMIN", "SUPERADMIN"),
  addOwnBalanceValidator,
  addBalanceToMyWalletController
);
router.post(
  "/add-balance",
  auth("ADMIN", "SUPERADMIN"),
  addBalanceValidator,
  addBalanceController
);
router.post(
  "/deduct-balance",
  auth("ADMIN", "SUPERADMIN"),
  deductBalanceValidator,
  deductBalanceController
);
router.post(
  "/refund",
  auth("ADMIN", "SUPERADMIN"),
  refundBalanceValidator,
  refundBalanceController
);
router.post(
  "/freeze",
  auth("ADMIN", "SUPERADMIN"),
  walletStatusBodyValidator,
  freezeWalletController
);
router.post(
  "/unfreeze",
  auth("ADMIN", "SUPERADMIN"),
  walletStatusBodyValidator,
  unfreezeWalletController
);

export default router;
