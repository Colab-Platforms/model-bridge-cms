import { Prisma, ProviderBalanceTransactionType } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

export interface CreateProviderBalanceTransactionInput {
  providerBalanceId: string;
  amount: Prisma.Decimal;
  type: ProviderBalanceTransactionType;
  balanceBefore: Prisma.Decimal;
  balanceAfter: Prisma.Decimal;
  description?: string;
  createdBy?: string;
  referenceId?: string;
  inferenceRequestId?: string;
  metadata?: Prisma.InputJsonValue;
}

export class ProviderBalanceTransactionService {
  async createTransaction(
    tx: TransactionClient,
    input: CreateProviderBalanceTransactionInput
  ) {
    return tx.providerBalanceTransaction.create({
      data: {
        providerBalanceId: input.providerBalanceId,
        amount: input.amount,
        type: input.type,
        balanceBefore: input.balanceBefore,
        balanceAfter: input.balanceAfter,
        description: input.description,
        createdBy: input.createdBy,
        referenceId: input.referenceId,
        inferenceRequestId: input.inferenceRequestId,
        metadata: input.metadata,
      },
    });
  }
}

export const providerBalanceTransactionService = new ProviderBalanceTransactionService();
