import type z from "zod";

import {
  addBalanceSchema,
  addOwnBalanceSchema,
  createWalletSchema,
  deductBalanceSchema,
  refundBalanceSchema,
  walletStatusBodySchema,
  walletTransactionsQuerySchema,
  walletUserIdParamsSchema,
} from "./wallets.validators.js";

export type WalletUserIdParams = z.infer<typeof walletUserIdParamsSchema>;
export type WalletTransactionsQuery = z.infer<typeof walletTransactionsQuerySchema>;
export type AddBalanceInput = z.infer<typeof addBalanceSchema>;
export type AddOwnBalanceInput = z.infer<typeof addOwnBalanceSchema>;
export type DeductBalanceInput = z.infer<typeof deductBalanceSchema>;
export type RefundBalanceInput = z.infer<typeof refundBalanceSchema>;
export type CreateWalletInput = z.infer<typeof createWalletSchema>;
export type WalletStatusBodyInput = z.infer<typeof walletStatusBodySchema>;

export interface WalletActor {
  userId?: string;
  email?: string;
}
