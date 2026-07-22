import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { activityLogMock, enqueueEmailMock } = vi.hoisted(() => ({
  activityLogMock: vi.fn(),
  enqueueEmailMock: vi.fn(),
}));

vi.mock("../../../prisma.js", () => ({
  default: {},
}));

vi.mock("../../services/activity-log.service.js", () => ({
  activityLogService: { log: activityLogMock },
}));

vi.mock("../../services/email.service.js", () => ({
  enqueueEmail: enqueueEmailMock,
}));

import { addBalanceInTransaction, deductBalanceInTransaction } from "./wallets.service.js";

const owner = { email: "owner@example.com" };

const buildWallet = (overrides: {
  balance: number;
  lowBalanceThreshold: number;
  alertsEnabled: boolean;
  lowBalanceAlertActive: boolean;
}) => ({
  id: "wallet-1",
  userId: "user-1",
  balance: new Prisma.Decimal(overrides.balance),
  currency: "USD",
  status: "ACTIVE",
  isDeleted: false,
  lowBalanceThreshold: new Prisma.Decimal(overrides.lowBalanceThreshold),
  alertsEnabled: overrides.alertsEnabled,
  lowBalanceAlertActive: overrides.lowBalanceAlertActive,
  user: owner,
});

const buildMockTx = (wallet: ReturnType<typeof buildWallet>) => {
  const walletFindFirstMock = vi.fn().mockResolvedValue(wallet);
  const walletFindUniqueMock = vi.fn().mockResolvedValue(wallet);
  const walletUpdateMock = vi.fn().mockImplementation(async ({ data }: any) => ({
    ...wallet,
    ...data,
  }));
  const walletTransactionCreateMock = vi.fn().mockResolvedValue({});
  const userFindFirstMock = vi.fn().mockResolvedValue({ id: wallet.userId });

  return {
    tx: {
      user: { findFirst: userFindFirstMock },
      wallet: { findFirst: walletFindFirstMock, findUnique: walletFindUniqueMock, update: walletUpdateMock },
      walletTransaction: { create: walletTransactionCreateMock },
    } as any,
    walletUpdateMock,
  };
};

describe("wallet low-balance alert — real-time hook", () => {
  beforeEach(() => {
    activityLogMock.mockReset();
    enqueueEmailMock.mockReset();
  });

  it("sends exactly one alert when a debit crosses below threshold", async () => {
    const wallet = buildWallet({ balance: 5, lowBalanceThreshold: 2, alertsEnabled: true, lowBalanceAlertActive: false });
    const { tx, walletUpdateMock } = buildMockTx(wallet);

    await deductBalanceInTransaction(
      { userId: "user-1", amount: 4, inferenceRequestId: "req-1" }, // 5 - 4 = 1, below threshold of 2
      tx
    );

    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: owner.email, subject: expect.stringContaining("low") })
    );
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "WALLET_LOW_BALANCE_ALERT_SENT" }),
      expect.anything()
    );
    expect(walletUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lowBalanceAlertActive: true, lastAlertSentAt: expect.any(Date) }),
      })
    );
  });

  it("does not resend while still below threshold and already alerted (no duplicate spam)", async () => {
    const wallet = buildWallet({ balance: 1, lowBalanceThreshold: 2, alertsEnabled: true, lowBalanceAlertActive: true });
    const { tx } = buildMockTx(wallet);

    await deductBalanceInTransaction(
      { userId: "user-1", amount: 0.5, inferenceRequestId: "req-2" }, // still below threshold, already active
      tx
    );

    expect(enqueueEmailMock).not.toHaveBeenCalled();
    expect(activityLogMock).not.toHaveBeenCalled();
  });

  it("does not send when alertsEnabled is false, even when crossing below threshold", async () => {
    const wallet = buildWallet({ balance: 5, lowBalanceThreshold: 2, alertsEnabled: false, lowBalanceAlertActive: false });
    const { tx } = buildMockTx(wallet);

    await deductBalanceInTransaction(
      { userId: "user-1", amount: 4, inferenceRequestId: "req-3" },
      tx
    );

    expect(enqueueEmailMock).not.toHaveBeenCalled();
    expect(activityLogMock).not.toHaveBeenCalled();
  });

  it("resolves and sends a restoration email exactly once when a topup crosses back above threshold", async () => {
    const wallet = buildWallet({ balance: 1, lowBalanceThreshold: 2, alertsEnabled: true, lowBalanceAlertActive: true });
    const { tx, walletUpdateMock } = buildMockTx(wallet);

    await addBalanceInTransaction(
      { userId: "user-1", amount: 10 }, // 1 + 10 = 11, above threshold of 2
      tx
    );

    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: owner.email, subject: expect.stringContaining("restored") })
    );
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "WALLET_LOW_BALANCE_ALERT_RESOLVED" }),
      expect.anything()
    );
    expect(walletUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ lowBalanceAlertActive: false, lastAlertResolvedAt: expect.any(Date) }),
      })
    );
  });

  it("does not resolve a topup that is still below threshold", async () => {
    const wallet = buildWallet({ balance: 0.5, lowBalanceThreshold: 2, alertsEnabled: true, lowBalanceAlertActive: true });
    const { tx } = buildMockTx(wallet);

    await addBalanceInTransaction(
      { userId: "user-1", amount: 1 }, // 0.5 + 1 = 1.5, still below threshold of 2
      tx
    );

    // addBalanceInTransaction always logs WALLET_TOPUP regardless of the alert
    // logic — only the alert-specific activity type must be absent here.
    expect(enqueueEmailMock).not.toHaveBeenCalled();
    expect(activityLogMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "WALLET_LOW_BALANCE_ALERT_RESOLVED" }),
      expect.anything()
    );
  });
});
