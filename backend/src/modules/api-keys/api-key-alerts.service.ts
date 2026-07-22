import { ActivityType, ApiKeyStatus, LimitType, Prisma } from "@prisma/client";

import prisma from "../../../prisma.js";
import { activityLogService } from "../../services/activity-log.service.js";
import { enqueueEmail } from "../../services/email.service.js";
import { decideThresholdAlert } from "../../services/threshold-alert.service.js";

/** Days before ApiKey.expiresAt that the one-time expiry warning email fires. */
export const API_KEY_EXPIRY_WARNING_DAYS = 7;

/** Fraction of ApiKey.creditLimit reached (for the current period) that triggers the usage warning. */
export const API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT = 80;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Start of the current billing period for a given limitType, in UTC. Calendar-aligned
 * (not a rolling window) so it matches how a periodic credit limit is expected to
 * reset: DAILY resets at midnight, MONTHLY on the 1st, etc. WEEKLY uses an ISO week
 * (Monday start) — a judgment call, flag if Sunday-start is wanted instead.
 */
export const getPeriodStart = (limitType: LimitType, reference: Date): Date => {
  const year = reference.getUTCFullYear();
  const month = reference.getUTCMonth();
  const date = reference.getUTCDate();

  switch (limitType) {
    case LimitType.DAILY:
      return new Date(Date.UTC(year, month, date));
    case LimitType.WEEKLY: {
      const day = reference.getUTCDay();
      const diffToMonday = (day + 6) % 7;
      return new Date(Date.UTC(year, month, date - diffToMonday));
    }
    case LimitType.MONTHLY:
      return new Date(Date.UTC(year, month, 1));
    case LimitType.QUATERLY:
      return new Date(Date.UTC(year, Math.floor(month / 3) * 3, 1));
    case LimitType.YEARLY:
      return new Date(Date.UTC(year, 0, 1));
    case LimitType.UNLIMITED:
      return new Date(Date.UTC(year, month, date));
  }
};

const formatKeyLabel = (apiKey: { name: string | null; keyPrefix: string }) =>
  apiKey.name ? `${apiKey.name} (${apiKey.keyPrefix}…)` : `${apiKey.keyPrefix}…`;

/** Scans ACTIVE keys expiring within the warning window and sends a one-time email. */
export const runApiKeyExpiryCheck = async () => {
  const now = new Date();
  const warningCutoff = new Date(now.getTime() + API_KEY_EXPIRY_WARNING_DAYS * DAY_MS);

  const candidates = await prisma.apiKey.findMany({
    where: {
      status: ApiKeyStatus.ACTIVE,
      isDeleted: false,
      expiryAlertSentAt: null,
      expiresAt: { gte: now, lte: warningCutoff },
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      expiresAt: true,
      userId: true,
      user: { select: { email: true } },
    },
  });

  for (const apiKey of candidates) {
    const keyLabel = formatKeyLabel(apiKey);
    const expiresAtText = apiKey.expiresAt!.toISOString().slice(0, 10);

    await enqueueEmail({
      to: apiKey.user.email,
      subject: `Your API key "${keyLabel}" expires soon`,
      text: `Your API key ${keyLabel} expires on ${expiresAtText}. Rotate or renew it before then to avoid losing access.`,
      html: `<p>Your API key <strong>${keyLabel}</strong> expires on <strong>${expiresAtText}</strong>. Rotate or renew it before then to avoid losing access.</p>`,
    });

    await prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: apiKey.id },
        data: { expiryAlertSentAt: now },
      });

      await activityLogService.log(
        {
          activityType: ActivityType.API_KEY_EXPIRY_WARNING_SENT,
          entityType: "API_KEY",
          entityId: apiKey.id,
          userId: apiKey.userId,
          metadata: {
            expiresAt: apiKey.expiresAt!.toISOString(),
            warningDays: API_KEY_EXPIRY_WARNING_DAYS,
          },
        },
        tx
      );
    });
  }

  return { alertedKeys: candidates.length };
};

/**
 * Scans ACTIVE keys with a periodic credit limit and sends a one-time-per-period email
 * once usage (computed live from InferenceRequest, never a running counter) reaches
 * API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT of the limit.
 */
export const runApiKeyLimitCheck = async () => {
  const now = new Date();

  const candidates = await prisma.apiKey.findMany({
    where: {
      status: ApiKeyStatus.ACTIVE,
      isDeleted: false,
      creditLimit: { not: null },
      limitType: { notIn: [LimitType.UNLIMITED] },
    },
    select: {
      id: true,
      name: true,
      keyPrefix: true,
      userId: true,
      creditLimit: true,
      limitType: true,
      limitAlertPeriodStart: true,
      user: { select: { email: true } },
    },
  });

  let alertedKeys = 0;

  for (const apiKey of candidates) {
    const creditLimit = apiKey.creditLimit!;
    const limitType = apiKey.limitType!;
    const periodStart = getPeriodStart(limitType, now);

    const alreadyAlertedThisPeriod =
      apiKey.limitAlertPeriodStart !== null &&
      apiKey.limitAlertPeriodStart.getTime() === periodStart.getTime();

    const usageAgg = await prisma.inferenceRequest.aggregate({
      where: { apiKeyId: apiKey.id, createdAt: { gte: periodStart } },
      _sum: { totalCost: true },
    });
    const usage = usageAgg._sum.totalCost ?? new Prisma.Decimal(0);
    const thresholdAmount = creditLimit.mul(API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT).div(100);

    const { shouldSend } = decideThresholdAlert({
      isTriggered: usage.gte(thresholdAmount),
      alertActive: alreadyAlertedThisPeriod,
      supportsResolution: false,
    });

    if (!shouldSend) {
      continue;
    }

    const keyLabel = formatKeyLabel(apiKey);
    const periodLabel = limitType.toLowerCase();

    await enqueueEmail({
      to: apiKey.user.email,
      subject: `Your API key "${keyLabel}" is nearing its ${periodLabel} limit`,
      text: `Your API key ${keyLabel} has used $${usage.toFixed(4)} of its $${creditLimit.toFixed(4)} ${periodLabel} limit (${API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT}% threshold reached).`,
      html: `<p>Your API key <strong>${keyLabel}</strong> has used <strong>$${usage.toFixed(4)}</strong> of its <strong>$${creditLimit.toFixed(4)}</strong> ${periodLabel} limit (${API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT}% threshold reached).</p>`,
    });

    await prisma.$transaction(async (tx) => {
      await tx.apiKey.update({
        where: { id: apiKey.id },
        data: { limitAlertSentAt: now, limitAlertPeriodStart: periodStart },
      });

      await activityLogService.log(
        {
          activityType: ActivityType.API_KEY_LIMIT_WARNING_SENT,
          entityType: "API_KEY",
          entityId: apiKey.id,
          userId: apiKey.userId,
          metadata: {
            limitType,
            creditLimit: creditLimit.toString(),
            usage: usage.toString(),
            periodStart: periodStart.toISOString(),
            thresholdPercent: API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT,
          },
        },
        tx
      );
    });

    alertedKeys += 1;
  }

  return { alertedKeys };
};
