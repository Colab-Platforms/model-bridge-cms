import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  walletFindManyMock,
  walletUpdateMock,
  activityLogMock,
  enqueueEmailMock,
  transactionMock,
} = vi.hoisted(() => ({
  walletFindManyMock: vi.fn(),
  walletUpdateMock: vi.fn(),
  activityLogMock: vi.fn(),
  enqueueEmailMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("../../../prisma.js", () => ({
  default: {
    wallet: {
      findMany: walletFindManyMock,
      update: walletUpdateMock,
    },
    $transaction: transactionMock,
  },
}));

vi.mock("../../services/activity-log.service.js", () => ({
  activityLogService: { log: activityLogMock },
}));

vi.mock("../../services/email.service.js", () => ({
  enqueueEmail: enqueueEmailMock,
}));

import { runWalletLowBalanceCheck } from "./wallet-alerts.service.js";

const owner = { email: "owner@example.com" };

const buildWallet = (overrides: {
  id: string;
  balance: number;
  lowBalanceThreshold: number;
  lowBalanceAlertActive: boolean;
}) => ({
  id: overrides.id,
  userId: `user-${overrides.id}`,
  balance: new Prisma.Decimal(overrides.balance),
  lowBalanceThreshold: new Prisma.Decimal(overrides.lowBalanceThreshold),
  alertsEnabled: true,
  lowBalanceAlertActive: overrides.lowBalanceAlertActive,
  user: owner,
});

describe("runWalletLowBalanceCheck (scheduled sweep backstop)", () => {
  beforeEach(() => {
    walletFindManyMock.mockReset();
    walletUpdateMock.mockReset();
    activityLogMock.mockReset();
    enqueueEmailMock.mockReset();
    transactionMock.mockReset();

    transactionMock.mockImplementation(async (callback: any) =>
      callback({ wallet: { update: walletUpdateMock } })
    );
  });

  it("alerts a wallet the sweep finds still below threshold and not yet alerted", async () => {
    const wallet = buildWallet({ id: "w1", balance: 1, lowBalanceThreshold: 2, lowBalanceAlertActive: false });

    walletFindManyMock.mockImplementation(async (args: any) => {
      if (args.where.lowBalanceAlertActive === false) return [wallet];
      if (args.where.lowBalanceAlertActive === true) return [];
      return [];
    });

    const result = await runWalletLowBalanceCheck();

    expect(result.alertedWallets).toBe(1);
    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "WALLET_LOW_BALANCE_ALERT_SENT" }),
      expect.anything()
    );
  });

  it("queries only ACTIVE, alertsEnabled wallets that are not already alertActive (structural dedup)", async () => {
    walletFindManyMock.mockResolvedValue([]);

    await runWalletLowBalanceCheck();

    const sendQueryCall = walletFindManyMock.mock.calls.find(
      ([args]: any) => args.where.lowBalanceAlertActive === false
    );
    expect(sendQueryCall).toBeDefined();
    expect(sendQueryCall![0].where).toEqual(
      expect.objectContaining({ isDeleted: false, status: "ACTIVE", alertsEnabled: true, lowBalanceAlertActive: false })
    );
  });

  it("does not double-send for a wallet the real-time path already caught (alertActive true, still below threshold)", async () => {
    // Simulates: real-time hook already fired (lowBalanceAlertActive: true). Even if
    // this wallet somehow appeared in a candidate list, decideThresholdAlert refuses
    // to resend while already active.
    const wallet = buildWallet({ id: "w2", balance: 1, lowBalanceThreshold: 2, lowBalanceAlertActive: true });

    walletFindManyMock.mockImplementation(async (args: any) => {
      if (args.where.lowBalanceAlertActive === false) return []; // real query would never return this wallet here
      if (args.where.lowBalanceAlertActive === true) return [wallet]; // shows up in "recovered" query instead
      return [];
    });

    const result = await runWalletLowBalanceCheck();

    // Still below threshold, so the "recovered" pass must not resolve it either.
    expect(result.alertedWallets).toBe(0);
    expect(result.resolvedWallets).toBe(0);
    expect(enqueueEmailMock).not.toHaveBeenCalled();
  });

  it("resolves and sends a restoration email for a wallet the sweep finds recovered", async () => {
    const wallet = buildWallet({ id: "w3", balance: 10, lowBalanceThreshold: 2, lowBalanceAlertActive: true });

    walletFindManyMock.mockImplementation(async (args: any) => {
      if (args.where.lowBalanceAlertActive === false) return [];
      if (args.where.lowBalanceAlertActive === true) return [wallet];
      return [];
    });

    const result = await runWalletLowBalanceCheck();

    expect(result.resolvedWallets).toBe(1);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: owner.email, subject: expect.stringContaining("restored") })
    );
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "WALLET_LOW_BALANCE_ALERT_RESOLVED" }),
      expect.anything()
    );
  });
});
