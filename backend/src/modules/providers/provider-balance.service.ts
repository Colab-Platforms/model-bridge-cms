import {
  ActivityType,
  Prisma,
  ProviderBalanceTransactionType,
  UserStatus,
} from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import { cacheInvalidatePattern } from "../../shared/utils/cache.js";
import { activityLogService, type TransactionClient } from "../../services/activity-log.service.js";
import { enqueueEmail } from "../../services/email.service.js";
import { formatPaginationResponse, getPaginationOptions } from "../../utils/paginationUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { assertPositiveAmount, toDecimal } from "../wallets/wallet.utils.js";
import { providerBalanceTransactionService } from "./provider-balance-transaction.service.js";

const providerBalanceSelect = {
  id: true,
  providerId: true,
  currentBalance: true,
  currency: true,
  lowBalanceThreshold: true,
  alertsEnabled: true,
  lowBalanceAlertActive: true,
  lastAlertSentAt: true,
  lastAlertResolvedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  updatedBy: true,
  provider: {
    select: {
      id: true,
      slug: true,
      displayName: true,
      isActive: true,
    },
  },
} satisfies Prisma.ProviderBalanceSelect;

const providerBalanceTransactionSelect = {
  id: true,
  providerBalanceId: true,
  inferenceRequestId: true,
  referenceId: true,
  type: true,
  amount: true,
  balanceBefore: true,
  balanceAfter: true,
  description: true,
  metadata: true,
  createdBy: true,
  createdAt: true,
} satisfies Prisma.ProviderBalanceTransactionSelect;

const formatDecimalValue = (value: Prisma.Decimal | null | undefined) => {
  if (value === null || value === undefined) {
    return null;
  }

  return value.toFixed(value.decimalPlaces());
};

const formatProviderBalanceRecord = <
  T extends {
    currentBalance: Prisma.Decimal;
    lowBalanceThreshold: Prisma.Decimal;
  },
>(
  record: T
) => ({
  ...record,
  currentBalance: formatDecimalValue(record.currentBalance) ?? "0",
  lowBalanceThreshold: formatDecimalValue(record.lowBalanceThreshold) ?? "0",
  isBelowThreshold: record.currentBalance.lte(record.lowBalanceThreshold),
});

const formatProviderBalanceTransactionRecord = <
  T extends {
    amount: Prisma.Decimal;
    balanceBefore: Prisma.Decimal;
    balanceAfter: Prisma.Decimal;
  },
>(
  record: T
) => ({
  ...record,
  amount: formatDecimalValue(record.amount) ?? "0",
  balanceBefore: formatDecimalValue(record.balanceBefore) ?? "0",
  balanceAfter: formatDecimalValue(record.balanceAfter) ?? "0",
});

const getProviderOrThrow = async (
  providerId: string,
  tx?: TransactionClient
) => {
  const db = tx ?? prisma;
  const provider = await db.provider.findFirst({
    where: {
      id: providerId,
      isDeleted: false,
    },
    select: {
      id: true,
      slug: true,
      displayName: true,
      isActive: true,
    },
  });

  if (!provider) {
    throw new AppError("Provider not found", STATUS_CODES.NOT_FOUND);
  }

  return provider;
};

export const ensureProviderBalance = async (
  providerId: string,
  tx?: TransactionClient,
  createdBy?: string
) => {
  const db = tx ?? prisma;

  await getProviderOrThrow(providerId, tx);

  const existingBalance = await db.providerBalance.findUnique({
    where: {
      providerId,
    },
    select: providerBalanceSelect,
  });

  if (existingBalance) {
    return existingBalance;
  }

  return db.providerBalance.create({
    data: {
      providerId,
      createdBy,
      updatedBy: createdBy,
    },
    select: providerBalanceSelect,
  });
};

const updateProviderBalanceWithTransaction = async (
  tx: TransactionClient,
  input: {
    providerId: string;
    amount: Prisma.Decimal;
    operation: "credit" | "debit" | "refund" | "adjust";
    description: string;
    createdBy?: string;
    referenceId?: string;
    inferenceRequestId?: string;
    metadata?: Prisma.InputJsonValue;
  }
) => {
  const providerBalance = await ensureProviderBalance(input.providerId, tx, input.createdBy);
  const beforeBalance = providerBalance.currentBalance;

  let afterBalance = beforeBalance;
  let transactionAmount = input.amount;
  let transactionType: ProviderBalanceTransactionType =
    ProviderBalanceTransactionType.ADJUSTMENT;

  switch (input.operation) {
    case "credit":
      afterBalance = beforeBalance.add(input.amount);
      transactionType = ProviderBalanceTransactionType.RECHARGE;
      break;
    case "refund":
      afterBalance = beforeBalance.add(input.amount);
      transactionType = ProviderBalanceTransactionType.REFUND;
      break;
    case "debit":
      afterBalance = beforeBalance.sub(input.amount);
      transactionType = ProviderBalanceTransactionType.USAGE_DEDUCTION;
      break;
    case "adjust":
      if (input.amount.eq(0)) {
        throw new AppError("Adjustment amount cannot be zero", STATUS_CODES.BAD_REQUEST);
      }
      afterBalance = beforeBalance.add(input.amount);
      transactionAmount = input.amount;
      transactionType = ProviderBalanceTransactionType.ADJUSTMENT;
      break;
  }

  const updatedProviderBalance = await tx.providerBalance.update({
    where: {
      id: providerBalance.id,
    },
    data: {
      currentBalance: afterBalance,
      updatedBy: input.createdBy,
      ...(providerBalance.lowBalanceAlertActive &&
      afterBalance.gt(providerBalance.lowBalanceThreshold)
        ? {
            lowBalanceAlertActive: false,
            lastAlertResolvedAt: new Date(),
          }
        : {}),
    },
    select: providerBalanceSelect,
  });

  await providerBalanceTransactionService.createTransaction(tx, {
    providerBalanceId: providerBalance.id,
    amount: transactionAmount,
    type: transactionType,
    balanceBefore: beforeBalance,
    balanceAfter: afterBalance,
    description: input.description,
    createdBy: input.createdBy,
    referenceId: input.referenceId,
    inferenceRequestId: input.inferenceRequestId,
    metadata: input.metadata,
  });

  if (
    providerBalance.lowBalanceAlertActive &&
    afterBalance.gt(providerBalance.lowBalanceThreshold)
  ) {
    await activityLogService.log(
      {
        activityType: ActivityType.PROVIDER_LOW_BALANCE_ALERT_RESOLVED,
        entityType: "PROVIDER",
        entityId: input.providerId,
        actorId: input.createdBy,
        metadata: {
          providerBalanceId: providerBalance.id,
          balanceAfter: afterBalance.toString(),
          threshold: providerBalance.lowBalanceThreshold.toString(),
        },
      },
      tx
    );
  }

  return updatedProviderBalance;
};

export interface ProviderBalanceListQuery {
  slug?: string;
  isActive?: boolean;
  lowBalanceOnly?: boolean;
}

export interface ProviderBalanceLedgerQuery {
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface ProviderBalanceMutationInput {
  providerId: string;
  amount: number | string | Prisma.Decimal;
  description?: string;
  referenceId?: string;
  createdBy?: string;
}

export interface ProviderBalanceSettingsInput {
  lowBalanceThreshold?: number | string | Prisma.Decimal;
  alertsEnabled?: boolean;
  currency?: string;
}

export const getProviderBalances = async (query: ProviderBalanceListQuery) => {
  const providers = await prisma.provider.findMany({
    where: {
      isDeleted: false,
      ...(query.slug ? { slug: query.slug } : {}),
      ...(typeof query.isActive === "boolean" ? { isActive: query.isActive } : {}),
    },
    select: {
      id: true,
    },
  });

  if (providers.length === 0) {
    return [];
  }

  const providerIds = providers.map((provider) => provider.id);
  const existingBalances = await prisma.providerBalance.findMany({
    where: {
      providerId: {
        in: providerIds,
      },
    },
    select: {
      providerId: true,
    },
  });

  const existingProviderIds = new Set(existingBalances.map((item) => item.providerId));
  const missingProviderIds = providerIds.filter((providerId) => !existingProviderIds.has(providerId));

  if (missingProviderIds.length > 0) {
    await prisma.providerBalance.createMany({
      data: missingProviderIds.map((providerId) => ({
        providerId,
      })),
      skipDuplicates: true,
    });
  }

  const balances = await prisma.providerBalance.findMany({
    where: {
      providerId: {
        in: providerIds,
      },
    },
    select: providerBalanceSelect,
    orderBy: [
      {
        provider: {
          displayName: "asc",
        },
      },
      {
        createdAt: "asc",
      },
    ],
  });

  return balances
    .filter((balance) => !query.lowBalanceOnly || balance.currentBalance.lte(balance.lowBalanceThreshold))
    .map((balance) => formatProviderBalanceRecord(balance));
};

export const getProviderBalanceByProviderId = async (providerId: string) =>
  formatProviderBalanceRecord(await ensureProviderBalance(providerId));

export const getProviderBalanceLedger = async (
  providerId: string,
  query: ProviderBalanceLedgerQuery
) => {
  const providerBalance = await ensureProviderBalance(providerId);
  const effectiveQuery = query.limit ? { ...query, page: 1, pageSize: query.limit } : query;
  const { take, skip, page, pageSize } = getPaginationOptions(effectiveQuery, 20);
  const where: Prisma.ProviderBalanceTransactionWhereInput = {
    providerBalanceId: providerBalance.id,
    isDeleted: false,
  };

  const [transactions, totalRecords] = await Promise.all([
    prisma.providerBalanceTransaction.findMany({
      where,
      select: providerBalanceTransactionSelect,
      orderBy: {
        createdAt: "desc",
      },
      take,
      skip,
    }),
    prisma.providerBalanceTransaction.count({ where }),
  ]);

  return formatPaginationResponse(
    transactions.map((transaction) => formatProviderBalanceTransactionRecord(transaction)),
    totalRecords,
    page,
    pageSize
  );
};

export const rechargeProviderBalance = async (input: ProviderBalanceMutationInput) => {
  const amount = assertPositiveAmount(input.amount);

  const result = await prisma.$transaction(async (tx) => {
    const updatedProviderBalance = await updateProviderBalanceWithTransaction(tx, {
      providerId: input.providerId,
      amount,
      operation: "credit",
      description: input.description?.trim() || "Provider balance recharge",
      createdBy: input.createdBy,
      referenceId: input.referenceId,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROVIDER_BALANCE_RECHARGED,
        entityType: "PROVIDER",
        entityId: input.providerId,
        actorId: input.createdBy,
        metadata: {
          amount: amount.toString(),
          balance: updatedProviderBalance.currentBalance.toString(),
          threshold: updatedProviderBalance.lowBalanceThreshold.toString(),
          referenceId: input.referenceId ?? null,
        },
      },
      tx
    );

    return updatedProviderBalance;
  });

  await cacheInvalidatePattern("admin:overview:*");

  return formatProviderBalanceRecord(result);
};

export const adjustProviderBalance = async (input: ProviderBalanceMutationInput) => {
  const amount = toDecimal(input.amount);

  if (amount.eq(0)) {
    throw new AppError("Adjustment amount cannot be zero", STATUS_CODES.BAD_REQUEST);
  }

  const result = await prisma.$transaction(async (tx) => {
    const updatedProviderBalance = await updateProviderBalanceWithTransaction(tx, {
      providerId: input.providerId,
      amount,
      operation: "adjust",
      description: input.description?.trim() || "Provider balance adjustment",
      createdBy: input.createdBy,
      referenceId: input.referenceId,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROVIDER_BALANCE_ADJUSTED,
        entityType: "PROVIDER",
        entityId: input.providerId,
        actorId: input.createdBy,
        metadata: {
          amount: amount.toString(),
          balance: updatedProviderBalance.currentBalance.toString(),
          threshold: updatedProviderBalance.lowBalanceThreshold.toString(),
          referenceId: input.referenceId ?? null,
        },
      },
      tx
    );

    return updatedProviderBalance;
  });

  await cacheInvalidatePattern("admin:overview:*");

  return formatProviderBalanceRecord(result);
};

export const updateProviderBalanceSettings = async (
  providerId: string,
  input: ProviderBalanceSettingsInput,
  actorId?: string
) => {
  const existingProviderBalance = await ensureProviderBalance(providerId);
  const nextThreshold =
    input.lowBalanceThreshold !== undefined
      ? assertPositiveAmount(input.lowBalanceThreshold)
      : existingProviderBalance.lowBalanceThreshold;
  const nextAlertsEnabled =
    input.alertsEnabled !== undefined
      ? input.alertsEnabled
      : existingProviderBalance.alertsEnabled;
  const shouldResolveAlert =
    existingProviderBalance.lowBalanceAlertActive &&
    (!nextAlertsEnabled || existingProviderBalance.currentBalance.gt(nextThreshold));

  const result = await prisma.providerBalance.update({
    where: {
      id: existingProviderBalance.id,
    },
    data: {
      ...(input.lowBalanceThreshold !== undefined
        ? { lowBalanceThreshold: nextThreshold }
        : {}),
      ...(input.alertsEnabled !== undefined ? { alertsEnabled: nextAlertsEnabled } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(shouldResolveAlert
        ? {
            lowBalanceAlertActive: false,
            lastAlertResolvedAt: new Date(),
          }
        : {}),
      updatedBy: actorId,
    },
    select: providerBalanceSelect,
  });

  await cacheInvalidatePattern("admin:overview:*");

  return formatProviderBalanceRecord(result);
};

export const deductProviderUsageCost = async (
  input: {
    providerId: string;
    amount: number | string | Prisma.Decimal;
    inferenceRequestId: string;
    createdBy?: string;
    referenceId?: string;
    description?: string;
    metadata?: Prisma.InputJsonValue;
  },
  tx?: TransactionClient
) => {
  const amount = assertPositiveAmount(input.amount);
  const executor = async (transactionClient: TransactionClient) =>
    updateProviderBalanceWithTransaction(transactionClient, {
      providerId: input.providerId,
      amount,
      operation: "debit",
      description: input.description?.trim() || "Provider usage deduction",
      createdBy: input.createdBy,
      referenceId: input.referenceId ?? input.inferenceRequestId,
      inferenceRequestId: input.inferenceRequestId,
      metadata: input.metadata,
    });

  const result = tx ? await executor(tx) : await prisma.$transaction(executor);

  return formatProviderBalanceRecord(result);
};

export const getProviderBalancesNeedingAlert = async () =>
  prisma.providerBalance.findMany({
    where: {
      alertsEnabled: true,
      lowBalanceAlertActive: false,
      provider: {
        isDeleted: false,
      },
    },
    select: providerBalanceSelect,
    orderBy: {
      createdAt: "asc",
    },
  });

export const getProviderBalancesRecoveredFromAlert = async () =>
  prisma.providerBalance.findMany({
    where: {
      lowBalanceAlertActive: true,
      provider: {
        isDeleted: false,
      },
    },
    select: providerBalanceSelect,
    orderBy: {
      createdAt: "asc",
    },
  });

export const getProviderLowBalanceAlertRecipients = async () => {
  const users = await prisma.user.findMany({
    where: {
      isDeleted: false,
      status: UserStatus.ACTIVE,
      userRoles: {
        some: {
          role: {
            name: {
              in: ["ADMIN", "SUPERADMIN"],
            },
          },
        },
      },
    },
    select: {
      email: true,
      firstName: true,
      lastName: true,
    },
  });

  return users;
};

export const markProviderLowBalanceAlertSent = async (
  providerBalanceId: string,
  actorId?: string
) => {
  const result = await prisma.$transaction(async (tx) => {
    const providerBalance = await tx.providerBalance.update({
      where: {
        id: providerBalanceId,
      },
      data: {
        lowBalanceAlertActive: true,
        lastAlertSentAt: new Date(),
      },
      select: providerBalanceSelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROVIDER_LOW_BALANCE_ALERT_SENT,
        entityType: "PROVIDER",
        entityId: providerBalance.providerId,
        actorId,
        metadata: {
          providerBalanceId: providerBalance.id,
          balance: providerBalance.currentBalance.toString(),
          threshold: providerBalance.lowBalanceThreshold.toString(),
        },
      },
      tx
    );

    return providerBalance;
  });

  return formatProviderBalanceRecord(result);
};

export const resolveProviderLowBalanceAlert = async (
  providerBalanceId: string,
  actorId?: string
) => {
  const result = await prisma.$transaction(async (tx) => {
    const providerBalance = await tx.providerBalance.update({
      where: {
        id: providerBalanceId,
      },
      data: {
        lowBalanceAlertActive: false,
        lastAlertResolvedAt: new Date(),
      },
      select: providerBalanceSelect,
    });

    await activityLogService.log(
      {
        activityType: ActivityType.PROVIDER_LOW_BALANCE_ALERT_RESOLVED,
        entityType: "PROVIDER",
        entityId: providerBalance.providerId,
        actorId,
        metadata: {
          providerBalanceId: providerBalance.id,
          balance: providerBalance.currentBalance.toString(),
          threshold: providerBalance.lowBalanceThreshold.toString(),
        },
      },
      tx
    );

    return providerBalance;
  });

  return formatProviderBalanceRecord(result);
};

const formatCurrencyForEmail = (value: Prisma.Decimal | string) => {
  const amount = typeof value === "string" ? Number(value) : Number(value);
  return amount.toFixed(4);
};

export const runProviderLowBalanceCheck = async () => {
  const [adminRecipients, candidates, recoveredBalances] = await Promise.all([
    getProviderLowBalanceAlertRecipients(),
    getProviderBalancesNeedingAlert(),
    getProviderBalancesRecoveredFromAlert(),
  ]);

  for (const recoveredBalance of recoveredBalances) {
    if (recoveredBalance.currentBalance.gt(recoveredBalance.lowBalanceThreshold)) {
      await resolveProviderLowBalanceAlert(recoveredBalance.id);
    }
  }

  const lowBalances = candidates.filter((balance) =>
    balance.currentBalance.lte(balance.lowBalanceThreshold)
  );

  if (lowBalances.length === 0 || adminRecipients.length === 0) {
    return {
      alertedProviders: 0,
      recoveredProviders: recoveredBalances.filter((balance) =>
        balance.currentBalance.gt(balance.lowBalanceThreshold)
      ).length,
    };
  }

  for (const balance of lowBalances) {
    const providerName = balance.provider.displayName ?? balance.provider.slug ?? balance.provider.id;
    const subject = `Provider low balance alert: ${providerName}`;
    const text = [
      `Provider ${providerName} is below its low balance threshold.`,
      `Current balance: $${formatCurrencyForEmail(balance.currentBalance)}`,
      `Threshold: $${formatCurrencyForEmail(balance.lowBalanceThreshold)}`,
      "Please recharge the provider account to avoid request failures.",
    ].join("\n");
    const html = `
      <p>Provider <strong>${providerName}</strong> is below its low balance threshold.</p>
      <p>Current balance: <strong>$${formatCurrencyForEmail(balance.currentBalance)}</strong></p>
      <p>Threshold: <strong>$${formatCurrencyForEmail(balance.lowBalanceThreshold)}</strong></p>
      <p>Please recharge the provider account to avoid request failures.</p>
    `;

    await Promise.all(
      adminRecipients.map((recipient) =>
        enqueueEmail({
          to: recipient.email,
          subject,
          text,
          html,
        })
      )
    );

    await markProviderLowBalanceAlertSent(balance.id);
  }

  return {
    alertedProviders: lowBalances.length,
    recoveredProviders: recoveredBalances.filter((balance) =>
      balance.currentBalance.gt(balance.lowBalanceThreshold)
    ).length,
  };
};
