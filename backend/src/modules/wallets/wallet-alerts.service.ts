import { ActivityType, Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import { activityLogService } from "../../services/activity-log.service.js";
import { enqueueEmail } from "../../services/email.service.js";
import { decideThresholdAlert } from "../../services/threshold-alert.service.js";
import { ACTIVE_WALLET_STATUS } from "./wallet.constants.js";

const walletAlertSelect = {
  id: true,
  userId: true,
  balance: true,
  lowBalanceThreshold: true,
  alertsEnabled: true,
  lowBalanceAlertActive: true,
  user: { select: { email: true } },
} satisfies Prisma.WalletSelect;

const formatCurrencyForEmail = (value: Prisma.Decimal) => Number(value).toFixed(4);

export const getWalletsNeedingAlert = async () =>
  prisma.wallet.findMany({
    where: {
      isDeleted: false,
      status: ACTIVE_WALLET_STATUS,
      alertsEnabled: true,
      lowBalanceAlertActive: false,
    },
    select: walletAlertSelect,
    orderBy: { createdAt: "asc" },
  });

export const getWalletsRecoveredFromAlert = async () =>
  prisma.wallet.findMany({
    where: {
      isDeleted: false,
      lowBalanceAlertActive: true,
    },
    select: walletAlertSelect,
    orderBy: { createdAt: "asc" },
  });

/**
 * Backstop sweep for the wallet low-balance alert. The real-time hook inside
 * updateWalletBalanceWithTransaction (wallets.service.ts) already handles send and
 * resolve on every balance change, so in normal operation this finds nothing — it
 * only matters if that real-time path was somehow missed. Mirrors
 * runProviderLowBalanceCheck's shape (recovered pass, then needing-alert pass), but
 * one email per wallet owner rather than a fan-out to admins.
 */
export const runWalletLowBalanceCheck = async () => {
  const [needingAlert, recovered] = await Promise.all([
    getWalletsNeedingAlert(),
    getWalletsRecoveredFromAlert(),
  ]);

  let resolvedWallets = 0;

  for (const wallet of recovered) {
    const { shouldResolve } = decideThresholdAlert({
      isTriggered: wallet.balance.lte(wallet.lowBalanceThreshold),
      alertActive: wallet.lowBalanceAlertActive,
    });

    if (!shouldResolve) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { lowBalanceAlertActive: false, lastAlertResolvedAt: new Date() },
      });

      await activityLogService.log(
        {
          activityType: ActivityType.WALLET_LOW_BALANCE_ALERT_RESOLVED,
          entityType: "WALLET",
          entityId: wallet.id,
          userId: wallet.userId,
          metadata: {
            balance: wallet.balance.toString(),
            threshold: wallet.lowBalanceThreshold.toString(),
          },
        },
        tx
      );
    });

    await enqueueEmail({
      to: wallet.user.email,
      subject: "Your wallet balance has been restored",
      text: [
        `Your wallet balance has recovered to $${formatCurrencyForEmail(wallet.balance)}.`,
        `Low balance threshold: $${formatCurrencyForEmail(wallet.lowBalanceThreshold)}`,
      ].join("\n"),
      html: `
        <p>Your wallet balance has recovered to <strong>$${formatCurrencyForEmail(wallet.balance)}</strong>.</p>
        <p>Low balance threshold: <strong>$${formatCurrencyForEmail(wallet.lowBalanceThreshold)}</strong></p>
      `,
    });

    resolvedWallets += 1;
  }

  let alertedWallets = 0;

  for (const wallet of needingAlert) {
    const { shouldSend } = decideThresholdAlert({
      isTriggered: wallet.balance.lte(wallet.lowBalanceThreshold),
      alertActive: wallet.lowBalanceAlertActive,
    });

    if (!shouldSend) {
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { lowBalanceAlertActive: true, lastAlertSentAt: new Date() },
      });

      await activityLogService.log(
        {
          activityType: ActivityType.WALLET_LOW_BALANCE_ALERT_SENT,
          entityType: "WALLET",
          entityId: wallet.id,
          userId: wallet.userId,
          metadata: {
            balance: wallet.balance.toString(),
            threshold: wallet.lowBalanceThreshold.toString(),
          },
        },
        tx
      );
    });

    await enqueueEmail({
      to: wallet.user.email,
      subject: "Your wallet balance is low",
      text: [
        `Your wallet balance has dropped to $${formatCurrencyForEmail(wallet.balance)}.`,
        `Low balance threshold: $${formatCurrencyForEmail(wallet.lowBalanceThreshold)}`,
        "Top up your wallet to avoid interrupted API access.",
      ].join("\n"),
      html: `
        <p>Your wallet balance has dropped to <strong>$${formatCurrencyForEmail(wallet.balance)}</strong>.</p>
        <p>Low balance threshold: <strong>$${formatCurrencyForEmail(wallet.lowBalanceThreshold)}</strong></p>
        <p>Top up your wallet to avoid interrupted API access.</p>
      `,
    });

    alertedWallets += 1;
  }

  return { alertedWallets, resolvedWallets };
};
