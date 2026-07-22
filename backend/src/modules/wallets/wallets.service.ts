import { ActivityType, Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { activityLogService } from "../../services/activity-log.service.js";
import { enqueueEmail } from "../../services/email.service.js";
import { decideThresholdAlert } from "../../services/threshold-alert.service.js";
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
  lowBalanceThreshold: true,
  alertsEnabled: true,
  lowBalanceAlertActive: true,
  lastAlertSentAt: true,
  lastAlertResolvedAt: true,
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

const formatCurrencyForEmail = (value: Prisma.Decimal) => Number(value).toFixed(4);

/**
 * Real-time low-balance alert hook — mirrors updateProviderBalanceWithTransaction,
 * but goes further: provider balance only auto-resolves in real time (its send path
 * is sweep-only), whereas here both send and resolve fire immediately on the balance
 * change that crosses the threshold, per explicit request. enqueueEmail is a cheap
 * Redis add (not a blocking send), so doing this inside the debit/credit/refund
 * transaction is low-cost — same tradeoff already accepted for activityLogService.log
 * inside these transactions elsewhere in this file.
 */
const applyWalletLowBalanceAlert = async (
  tx: TransactionClient,
  wallet: {
    id: string;
    userId: string;
    lowBalanceThreshold: Prisma.Decimal;
    alertsEnabled: boolean;
    lowBalanceAlertActive: boolean;
    user: { email: string };
  },
  afterBalance: Prisma.Decimal
) => {
  const isTriggered = wallet.alertsEnabled && afterBalance.lte(wallet.lowBalanceThreshold);
  const { shouldSend, shouldResolve } = decideThresholdAlert({
    isTriggered,
    alertActive: wallet.lowBalanceAlertActive,
  });

  if (!shouldSend && !shouldResolve) {
    return {};
  }

  if (shouldSend) {
    await activityLogService.log(
      {
        activityType: ActivityType.WALLET_LOW_BALANCE_ALERT_SENT,
        entityType: "WALLET",
        entityId: wallet.id,
        userId: wallet.userId,
        metadata: {
          balance: afterBalance.toString(),
          threshold: wallet.lowBalanceThreshold.toString(),
        },
      },
      tx
    );

    await enqueueEmail({
      to: wallet.user.email,
      subject: "Your wallet balance is low",
      text: [
        `Your wallet balance has dropped to $${formatCurrencyForEmail(afterBalance)}.`,
        `Low balance threshold: $${formatCurrencyForEmail(wallet.lowBalanceThreshold)}`,
        "Top up your wallet to avoid interrupted API access.",
      ].join("\n"),
      html: `
        <p>Your wallet balance has dropped to <strong>$${formatCurrencyForEmail(afterBalance)}</strong>.</p>
        <p>Low balance threshold: <strong>$${formatCurrencyForEmail(wallet.lowBalanceThreshold)}</strong></p>
        <p>Top up your wallet to avoid interrupted API access.</p>
      `,
    });
  }

  if (shouldResolve) {
    await activityLogService.log(
      {
        activityType: ActivityType.WALLET_LOW_BALANCE_ALERT_RESOLVED,
        entityType: "WALLET",
        entityId: wallet.id,
        userId: wallet.userId,
        metadata: {
          balance: afterBalance.toString(),
          threshold: wallet.lowBalanceThreshold.toString(),
        },
      },
      tx
    );

    await enqueueEmail({
      to: wallet.user.email,
      subject: "Your wallet balance has been restored",
      text: [
        `Your wallet balance has recovered to $${formatCurrencyForEmail(afterBalance)}.`,
        `Low balance threshold: $${formatCurrencyForEmail(wallet.lowBalanceThreshold)}`,
      ].join("\n"),
      html: `
        <p>Your wallet balance has recovered to <strong>$${formatCurrencyForEmail(afterBalance)}</strong>.</p>
        <p>Low balance threshold: <strong>$${formatCurrencyForEmail(wallet.lowBalanceThreshold)}</strong></p>
      `,
    });
  }

  return {
    ...(shouldSend ? { lowBalanceAlertActive: true, lastAlertSentAt: new Date() } : {}),
    ...(shouldResolve ? { lowBalanceAlertActive: false, lastAlertResolvedAt: new Date() } : {}),
  };
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
    include: {
      user: { select: { email: true } },
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

  const alertFieldUpdates = await applyWalletLowBalanceAlert(tx, wallet, afterBalance);

  const updatedWallet = await tx.wallet.update({
    where: {
      id: wallet.id,
    },
    data: {
      balance: afterBalance,
      updatedBy: input.createdBy,
      ...alertFieldUpdates,
    },
    select: walletSelect,
  });

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

export const addBalanceInTransaction = async (
  input: Omit<AddBalanceInput, "amount"> & { amount: number | string | Prisma.Decimal },
  tx: TransactionClient
) => {
  const amount = assertPositiveAmount(input.amount);

  await getExistingUser(input.userId, tx);

  const wallet = await createWallet(input.userId, input.createdBy, tx);
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
  const executor = async (tx: TransactionClient) => {
    const wallet = await getWalletOrThrow(input.userId, tx);

    return formatWalletRecord(
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
    );
  };

  return prisma.$transaction(executor);
};

export const deductBalanceInTransaction = async (
  input: DeductBalanceInput,
  tx: TransactionClient
) => {
  const amount = assertPositiveAmount(input.amount);
  const wallet = await getWalletOrThrow(input.userId, tx);

  return formatWalletRecord(
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
  );
};

export const refundBalance = async (input: RefundBalanceInput) => {
  const amount = assertPositiveAmount(input.amount);
  const executor = async (tx: TransactionClient) => {
    const wallet = await getWalletOrThrow(input.userId, tx);
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
  };

  return prisma.$transaction(executor);
};

export const refundBalanceInTransaction = async (
  input: RefundBalanceInput,
  tx: TransactionClient
) => {
  const amount = assertPositiveAmount(input.amount);
  const wallet = await getWalletOrThrow(input.userId, tx);

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
};

export const deductCredits = async (input: {
  userId: string;
  amount: number | string | Prisma.Decimal;
  inferenceRequestId: string;
  createdBy?: string;
  referenceId?: string;
  description?: string;
}) => deductBalance({
  userId: input.userId,
  amount: input.amount instanceof Prisma.Decimal ? input.amount.toString() : input.amount,
  inferenceRequestId: input.inferenceRequestId,
  createdBy: input.createdBy,
  referenceId: input.referenceId ?? input.inferenceRequestId,
  description: buildWalletDescription("AI Model Usage", input.description),
});

export const deductCreditsInTransaction = async (
  input: {
    userId: string;
    amount: number | string | Prisma.Decimal;
    inferenceRequestId: string;
    createdBy?: string;
    referenceId?: string;
    description?: string;
  },
  tx: TransactionClient
) =>
  deductBalanceInTransaction(
    {
      userId: input.userId,
      amount: input.amount instanceof Prisma.Decimal ? input.amount.toString() : input.amount,
      inferenceRequestId: input.inferenceRequestId,
      createdBy: input.createdBy,
      referenceId: input.referenceId ?? input.inferenceRequestId,
      description: buildWalletDescription("AI Model Usage", input.description),
    },
    tx
  );

export const refundCredits = async (input: {
  userId: string;
  amount: number | string | Prisma.Decimal;
  inferenceRequestId: string;
  createdBy?: string;
  referenceId?: string;
  description?: string;
}) => refundBalance({
  userId: input.userId,
  amount: input.amount instanceof Prisma.Decimal ? input.amount.toString() : input.amount,
  inferenceRequestId: input.inferenceRequestId,
  createdBy: input.createdBy,
  referenceId: input.referenceId ?? input.inferenceRequestId,
  description: buildWalletDescription("AI Usage Refund", input.description),
});

export const refundCreditsInTransaction = async (
  input: {
    userId: string;
    amount: number | string | Prisma.Decimal;
    inferenceRequestId: string;
    createdBy?: string;
    referenceId?: string;
    description?: string;
  },
  tx: TransactionClient
) =>
  refundBalanceInTransaction(
    {
      userId: input.userId,
      amount: input.amount instanceof Prisma.Decimal ? input.amount.toString() : input.amount,
      inferenceRequestId: input.inferenceRequestId,
      createdBy: input.createdBy,
      referenceId: input.referenceId ?? input.inferenceRequestId,
      description: buildWalletDescription("AI Usage Refund", input.description),
    },
    tx
  );

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
