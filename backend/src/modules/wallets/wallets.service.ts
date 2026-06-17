import { ActivityType, Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { activityLogService } from "../../services/activity-log.service.js";
import {
  formatPaginationResponse,
  getPaginationOptions,
} from "../../utils/paginationUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { walletTransactionService } from "./wallet-transaction.service.js";
import {
  ACTIVE_WALLET_STATUS,
  DEFAULT_WALLET_CURRENCY,
  INACTIVE_WALLET_STATUS,
  WALLET_ERRORS,
} from "./wallet.constants.js";
import {
  assertPositiveAmount,
  assertWalletUsable,
  buildWalletDescription,
  ensureSufficientBalance,
} from "./wallet.utils.js";
import type {
  AddBalanceInput,
  CreateWalletInput,
  DeductBalanceInput,
  RefundBalanceInput,
  WalletTransactionsQuery,
} from "./wallets.types.js";

type TransactionClient = Prisma.TransactionClient;

const walletSelect = {
  id: true,
  userId: true,
  balance: true,
  currency: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  isDeleted: true,
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
} satisfies Prisma.WalletSelect;

const formatDecimalValue = (value: Prisma.Decimal | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toFixed(value.decimalPlaces());
};

const formatWalletRecord = <
  T extends {
    balance: Prisma.Decimal;
  },
>(
  wallet: T
) => ({
  ...wallet,
  balance: formatDecimalValue(wallet.balance) ?? "0",
});

const formatWalletTransactionRecord = <
  T extends {
    amount: Prisma.Decimal;
    balanceBefore: Prisma.Decimal | null;
    balanceAfter: Prisma.Decimal | null;
  },
>(
  transaction: T
) => ({
  ...transaction,
  amount: formatDecimalValue(transaction.amount) ?? "0",
  balanceBefore: formatDecimalValue(transaction.balanceBefore),
  balanceAfter: formatDecimalValue(transaction.balanceAfter),
});

const getExistingUser = async (userId: string, tx?: TransactionClient) => {
  const db = tx ?? prisma;
  const user = await db.user.findFirst({
    where: {
      id: userId,
      isDeleted: false,
    },
    select: {
      id: true,
    },
  });

  if (!user) {
    throw new AppError(WALLET_ERRORS.USER_NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }

  return user;
};

const getWalletOrThrow = async (userId: string, tx?: TransactionClient) => {
  const db = tx ?? prisma;
  const wallet = await db.wallet.findFirst({
    where: {
      userId,
      isDeleted: false,
    },
    select: walletSelect,
  });

  if (!wallet) {
    throw new AppError(WALLET_ERRORS.NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }

  return wallet;
};

const updateWalletBalanceWithTransaction = async (
  tx: TransactionClient,
  input: {
    walletId: string;
    userId: string;
    amount: Prisma.Decimal;
    operation: "credit" | "debit" | "refund";
    description: string;
    createdBy?: string;
    referenceId?: string;
    inferenceRequestId?: string;
  }
) => {
  const wallet = await tx.wallet.findFirst({
    where: {
      id: input.walletId,
      userId: input.userId,
      isDeleted: false,
    },
  });

  if (!wallet) {
    throw new AppError(WALLET_ERRORS.NOT_FOUND, STATUS_CODES.NOT_FOUND);
  }

  assertWalletUsable(wallet);

  const beforeBalance = wallet.balance;
  let afterBalance = beforeBalance;

  if (input.operation === "debit") {
    ensureSufficientBalance(beforeBalance, input.amount);
    afterBalance = beforeBalance.sub(input.amount);
  } else {
    afterBalance = beforeBalance.add(input.amount);
  }

  const updatedWallet = await tx.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      balance: afterBalance,
      updatedBy: input.createdBy,
    },
    select: walletSelect,
  });

  if (input.operation === "debit") {
    await walletTransactionService.createDebitTransaction(tx, {
      walletId: wallet.id,
      amount: input.amount,
      balanceBefore: beforeBalance,
      balanceAfter: afterBalance,
      description: input.description,
      createdBy: input.createdBy,
      referenceId: input.referenceId,
      inferenceRequestId: input.inferenceRequestId,
    });
  } else if (input.operation === "refund") {
    await walletTransactionService.createRefundTransaction(tx, {
      walletId: wallet.id,
      amount: input.amount,
      balanceBefore: beforeBalance,
      balanceAfter: afterBalance,
      description: input.description,
      createdBy: input.createdBy,
      referenceId: input.referenceId,
      inferenceRequestId: input.inferenceRequestId,
    });
  } else {
    await walletTransactionService.createCreditTransaction(tx, {
      walletId: wallet.id,
      amount: input.amount,
      balanceBefore: beforeBalance,
      balanceAfter: afterBalance,
      description: input.description,
      createdBy: input.createdBy,
      referenceId: input.referenceId,
      inferenceRequestId: input.inferenceRequestId,
    });
  }

  return updatedWallet;
};

export const createWallet = async (
  userId: string,
  createdBy?: string,
  tx?: TransactionClient
) => {
  const db = tx ?? prisma;

  await getExistingUser(userId, tx);

  const existingWallet = await db.wallet.findUnique({
    where: {
      userId,
    },
    select: walletSelect,
  });

  if (existingWallet && !existingWallet.isDeleted) {
    return existingWallet;
  }

  return db.wallet.upsert({
    where: {
      userId,
    },
    update: {
      isDeleted: false,
      status: ACTIVE_WALLET_STATUS,
      updatedBy: createdBy,
      createdBy: existingWallet?.createdBy ?? createdBy,
    },
    create: {
      userId,
      currency: DEFAULT_WALLET_CURRENCY,
      status: ACTIVE_WALLET_STATUS,
      createdBy,
      updatedBy: createdBy,
    },
    select: walletSelect,
  });
};

export const createWalletService = async (input: CreateWalletInput, createdBy?: string) =>
  formatWalletRecord(await createWallet(input.userId, createdBy));

export const getWalletByUserId = async (userId: string) =>
  formatWalletRecord(await getWalletOrThrow(userId));

export const getBalance = async (userId: string) => {
  const wallet = await prisma.wallet.findFirst({
    where: { userId, isDeleted: false },
    select: walletSelect,
  });

  if (!wallet) {
    return {
      walletId: null,
      userId,
      balance: "0",
      currency: DEFAULT_WALLET_CURRENCY,
      status: ACTIVE_WALLET_STATUS,
    };
  }

  assertWalletUsable(wallet);

  return {
    walletId: wallet.id,
    userId: wallet.userId,
    balance: formatDecimalValue(wallet.balance) ?? "0",
    currency: wallet.currency,
    status: wallet.status,
  };
};

export const getWalletTransactions = async (
  userId: string,
  query: WalletTransactionsQuery
) => {
  const wallet = await getWalletOrThrow(userId);
  const effectiveQuery = query.limit
    ? { ...query, page: 1, pageSize: query.limit }
    : query;
  const { take, skip, page, pageSize } = getPaginationOptions(effectiveQuery, 20);
  const where: Prisma.WalletTransactionWhereInput = {
    walletId: wallet.id,
    isDeleted: false,
  };

  const [transactions, totalRecords] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      select: {
        id: true,
        walletId: true,
        inferenceRequestId: true,
        referenceId: true,
        type: true,
        amount: true,
        balanceBefore: true,
        balanceAfter: true,
        description: true,
        createdBy: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take,
      skip,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return formatPaginationResponse(
    transactions.map((transaction) => formatWalletTransactionRecord(transaction)),
    totalRecords,
    page,
    pageSize
  );
};

export const addBalance = async (input: AddBalanceInput) => {
  const amount = assertPositiveAmount(input.amount);

  await getExistingUser(input.userId);

  const wallet = await createWallet(input.userId, input.createdBy);

  return prisma.$transaction(async (tx) => {
    const updatedWallet = await updateWalletBalanceWithTransaction(tx, {
      walletId: wallet.id,
      userId: input.userId,
      amount,
      operation: "credit",
      description: buildWalletDescription("Wallet credit", input.description),
      createdBy: input.createdBy,
      referenceId: input.referenceId,
    });

    await activityLogService.log(
      {
        activityType:
          input.createdBy && input.createdBy !== input.userId
            ? ActivityType.CREDIT_GRANTED
            : ActivityType.WALLET_TOPUP,
        entityType: "WALLET",
        entityId: updatedWallet.id,
        actorId: input.createdBy ?? input.userId,
        userId: input.userId,
        metadata: {
          amount: amount.toString(),
          balance: updatedWallet.balance.toString(),
          currency: updatedWallet.currency,
          referenceId: input.referenceId ?? null,
        },
      },
      tx
    );

    return formatWalletRecord(updatedWallet);
  });
};

export const addBalanceToOwnWallet = async (
  userId: string,
  input: Omit<AddBalanceInput, "userId">
) =>
  addBalance({
    ...input,
    userId,
  });

export const deductBalance = async (input: DeductBalanceInput) => {
  const amount = assertPositiveAmount(input.amount);
  const wallet = await getWalletOrThrow(input.userId);

  return prisma.$transaction(async (tx) =>
    formatWalletRecord(
      await updateWalletBalanceWithTransaction(tx, {
      walletId: wallet.id,
      userId: input.userId,
      amount,
      operation: "debit",
      description: buildWalletDescription("Wallet debit", input.description),
      createdBy: input.createdBy,
      referenceId: input.referenceId,
      inferenceRequestId: input.inferenceRequestId,
      })
    )
  );
};

export const refundBalance = async (input: RefundBalanceInput) => {
  const amount = assertPositiveAmount(input.amount);
  const wallet = await getWalletOrThrow(input.userId);

  return prisma.$transaction(async (tx) => {
    const updatedWallet = await updateWalletBalanceWithTransaction(tx, {
      walletId: wallet.id,
      userId: input.userId,
      amount,
      operation: "refund",
      description: buildWalletDescription("Wallet refund", input.description),
      createdBy: input.createdBy,
      referenceId: input.referenceId,
      inferenceRequestId: input.inferenceRequestId,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.REFUND_ISSUED,
        entityType: "WALLET",
        entityId: updatedWallet.id,
        actorId: input.createdBy ?? input.userId,
        userId: input.userId,
        metadata: {
          amount: amount.toString(),
          balance: updatedWallet.balance.toString(),
          referenceId: input.referenceId ?? null,
          inferenceRequestId: input.inferenceRequestId ?? null,
        },
      },
      tx
    );

    return formatWalletRecord(updatedWallet);
  });
};

export const deductCredits = async (input: {
  userId: string;
  amount: number | string | Prisma.Decimal;
  inferenceRequestId: string;
  createdBy?: string;
  referenceId?: string;
  description?: string;
}) =>
  deductBalance({
    userId: input.userId,
    amount: input.amount instanceof Prisma.Decimal ? input.amount.toString() : input.amount,
    inferenceRequestId: input.inferenceRequestId,
    createdBy: input.createdBy,
    referenceId: input.referenceId ?? input.inferenceRequestId,
    description: buildWalletDescription("AI Model Usage", input.description),
  });

export const refundCredits = async (input: {
  userId: string;
  amount: number | string | Prisma.Decimal;
  inferenceRequestId: string;
  createdBy?: string;
  referenceId?: string;
  description?: string;
}) =>
  refundBalance({
    userId: input.userId,
    amount: input.amount instanceof Prisma.Decimal ? input.amount.toString() : input.amount,
    inferenceRequestId: input.inferenceRequestId,
    createdBy: input.createdBy,
    referenceId: input.referenceId ?? input.inferenceRequestId,
    description: buildWalletDescription("AI Usage Refund", input.description),
  });

export const freezeWallet = async (userId: string, updatedBy?: string) => {
  const wallet = await getWalletOrThrow(userId);

  return formatWalletRecord(await prisma.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      status: INACTIVE_WALLET_STATUS,
      updatedBy,
    },
    select: walletSelect,
  }));
};

export const unfreezeWallet = async (userId: string, updatedBy?: string) => {
  const wallet = await getWalletOrThrow(userId);

  return formatWalletRecord(await prisma.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      status: ACTIVE_WALLET_STATUS,
      updatedBy,
    },
    select: walletSelect,
  }));
};
