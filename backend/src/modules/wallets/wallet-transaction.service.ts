import { Prisma, WalletTransactionType } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

export interface CreateWalletTransactionInput {
  walletId: string;
  amount: Prisma.Decimal;
  type: WalletTransactionType;
  balanceBefore: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  description?: string;
  createdBy?: string;
  referenceId?: string;
  inferenceRequestId?: string;
}

export class WalletTransactionService {
  async createTransaction(
    tx: TransactionClient,
    input: CreateWalletTransactionInput
  ) {
    return tx.walletTransaction.create({
      data: {
        walletId: input.walletId,
        amount: input.amount,
        type: input.type,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        description: input.description,
        createdBy: input.createdBy,
        referenceId: input.referenceId,
        inferenceRequestId: input.inferenceRequestId,
      },
    });
  }

  async createCreditTransaction(
    tx: TransactionClient,
    input: Omit<CreateWalletTransactionInput, "type">
  ) {
    return this.createTransaction(tx, {
      ...input,
      type: WalletTransactionType.TOPUP,
    });
  }

  async createDebitTransaction(
    tx: TransactionClient,
    input: Omit<CreateWalletTransactionInput, "type">
  ) {
    return this.createTransaction(tx, {
      ...input,
      type: WalletTransactionType.USAGE_DEDUCTION,
    });
  }

  async createRefundTransaction(
    tx: TransactionClient,
    input: Omit<CreateWalletTransactionInput, "type">
  ) {
    return this.createTransaction(tx, {
      ...input,
      type: WalletTransactionType.REFUND,
    });
  }
}

export const walletTransactionService = new WalletTransactionService();
