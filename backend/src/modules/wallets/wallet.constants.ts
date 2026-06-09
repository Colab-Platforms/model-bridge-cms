import { WalletStatus, WalletTransactionType } from "@prisma/client";

export const DEFAULT_WALLET_CURRENCY = "USD";

export const WALLET_ERRORS = {
  NOT_FOUND: "Wallet not found",
  INACTIVE: "Wallet is inactive",
  DELETED: "Wallet is deleted",
  INSUFFICIENT_BALANCE: "Insufficient balance",
  INVALID_AMOUNT: "Amount must be greater than 0",
  USER_NOT_FOUND: "User not found",
} as const;

export const WALLET_TRANSACTION_KIND = {
  CREDIT: WalletTransactionType.CREDIT_GRANT,
  DEBIT: WalletTransactionType.USAGE_DEDUCTION,
  REFUND: WalletTransactionType.REFUND,
  TOPUP: WalletTransactionType.TOPUP,
} as const;

export const ACTIVE_WALLET_STATUS = WalletStatus.ACTIVE;
export const INACTIVE_WALLET_STATUS = WalletStatus.INACTIVE;
