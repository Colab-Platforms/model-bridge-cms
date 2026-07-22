import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  providerBalanceFindManyMock,
  providerBalanceUpdateMock,
  userFindManyMock,
  activityLogMock,
  enqueueEmailMock,
  transactionMock,
} = vi.hoisted(() => ({
  providerBalanceFindManyMock: vi.fn(),
  providerBalanceUpdateMock: vi.fn(),
  userFindManyMock: vi.fn(),
  activityLogMock: vi.fn(),
  enqueueEmailMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("../../../prisma.js", () => ({
  default: {
    providerBalance: {
      findMany: providerBalanceFindManyMock,
      update: providerBalanceUpdateMock,
    },
    user: {
      findMany: userFindManyMock,
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

import { runProviderLowBalanceCheck } from "./provider-balance.service.js";

const admin = { email: "admin@example.com", firstName: "Ad", lastName: "Min" };

const buildBalance = (overrides: {
  id: string;
  currentBalance: number;
  lowBalanceThreshold: number;
  alertsEnabled: boolean;
  lowBalanceAlertActive: boolean;
}) => ({
  id: overrides.id,
  providerId: `provider-${overrides.id}`,
  currentBalance: new Prisma.Decimal(overrides.currentBalance),
  currency: "USD",
  lowBalanceThreshold: new Prisma.Decimal(overrides.lowBalanceThreshold),
  alertsEnabled: overrides.alertsEnabled,
  lowBalanceAlertActive: overrides.lowBalanceAlertActive,
  lastAlertSentAt: null,
  lastAlertResolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  createdBy: null,
  updatedBy: null,
  provider: { id: `provider-${overrides.id}`, slug: `provider-${overrides.id}`, displayName: "Test Provider", isActive: true },
});

describe("runProviderLowBalanceCheck", () => {
  beforeEach(() => {
    providerBalanceFindManyMock.mockReset();
    providerBalanceUpdateMock.mockReset();
    userFindManyMock.mockReset();
    activityLogMock.mockReset();
    enqueueEmailMock.mockReset();
    transactionMock.mockReset();

    userFindManyMock.mockResolvedValue([admin]);
    transactionMock.mockImplementation(async (callback: any) =>
      callback({
        providerBalance: { update: providerBalanceUpdateMock },
      })
    );
    providerBalanceUpdateMock.mockImplementation(async ({ where, data }: any) => ({
      id: where.id,
      providerId: `provider-${where.id}`,
      currentBalance: new Prisma.Decimal(3),
      lowBalanceThreshold: new Prisma.Decimal(10),
      ...data,
    }));
  });

  it("sends exactly one alert when a balance crosses below threshold and isn't already alerted", async () => {
    const lowBalance = buildBalance({
      id: "low-1",
      currentBalance: 3,
      lowBalanceThreshold: 10,
      alertsEnabled: true,
      lowBalanceAlertActive: false,
    });

    providerBalanceFindManyMock.mockImplementation(async (args: any) => {
      if (args.where.lowBalanceAlertActive === false) return [lowBalance];
      if (args.where.lowBalanceAlertActive === true) return [];
      return [];
    });

    const result = await runProviderLowBalanceCheck();

    expect(result.alertedProviders).toBe(1);
    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: admin.email, subject: expect.stringContaining("low balance alert") })
    );
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "PROVIDER_LOW_BALANCE_ALERT_SENT" }),
      expect.anything()
    );
  });

  it("never queries balances that are already alertActive for the send path (no duplicate spam)", async () => {
    providerBalanceFindManyMock.mockImplementation(async (args: any) => {
      // getProviderBalancesNeedingAlert always filters lowBalanceAlertActive: false at the DB level.
      expect(args.where.lowBalanceAlertActive).toBeDefined();
      return [];
    });

    await runProviderLowBalanceCheck();

    const sendQueryCall = providerBalanceFindManyMock.mock.calls.find(
      ([args]: any) => args.where.lowBalanceAlertActive === false
    );
    expect(sendQueryCall).toBeDefined();
    expect(enqueueEmailMock).not.toHaveBeenCalled();
  });

  it("resolves and sends a restored email exactly once when a balance recovers above threshold", async () => {
    const recovered = buildBalance({
      id: "recovered-1",
      currentBalance: 15,
      lowBalanceThreshold: 10,
      alertsEnabled: true,
      lowBalanceAlertActive: true,
    });

    providerBalanceFindManyMock.mockImplementation(async (args: any) => {
      if (args.where.lowBalanceAlertActive === false) return [];
      if (args.where.lowBalanceAlertActive === true) return [recovered];
      return [];
    });

    const result = await runProviderLowBalanceCheck();

    expect(result.recoveredProviders).toBe(1);
    expect(providerBalanceUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "recovered-1" },
        data: expect.objectContaining({ lowBalanceAlertActive: false }),
      })
    );
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "PROVIDER_LOW_BALANCE_ALERT_RESOLVED" }),
      expect.anything()
    );
    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: admin.email, subject: expect.stringContaining("restored") })
    );
  });

  it("does not resolve a recovered balance that is still below threshold", async () => {
    const stillLow = buildBalance({
      id: "still-low-1",
      currentBalance: 5,
      lowBalanceThreshold: 10,
      alertsEnabled: true,
      lowBalanceAlertActive: true,
    });

    providerBalanceFindManyMock.mockImplementation(async (args: any) => {
      if (args.where.lowBalanceAlertActive === false) return [];
      if (args.where.lowBalanceAlertActive === true) return [stillLow];
      return [];
    });

    const result = await runProviderLowBalanceCheck();

    expect(result.recoveredProviders).toBe(0);
    expect(providerBalanceUpdateMock).not.toHaveBeenCalled();
    expect(enqueueEmailMock).not.toHaveBeenCalled();
  });
});
