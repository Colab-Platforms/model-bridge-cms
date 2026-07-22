import { LimitType, Prisma } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const {
  apiKeyFindManyMock,
  apiKeyUpdateMock,
  inferenceRequestAggregateMock,
  activityLogMock,
  enqueueEmailMock,
  transactionMock,
} = vi.hoisted(() => ({
  apiKeyFindManyMock: vi.fn(),
  apiKeyUpdateMock: vi.fn(),
  inferenceRequestAggregateMock: vi.fn(),
  activityLogMock: vi.fn(),
  enqueueEmailMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock("../../../prisma.js", () => ({
  default: {
    apiKey: {
      findMany: apiKeyFindManyMock,
      update: apiKeyUpdateMock,
    },
    inferenceRequest: {
      aggregate: inferenceRequestAggregateMock,
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

import {
  API_KEY_EXPIRY_WARNING_DAYS,
  API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT,
  getPeriodStart,
  runApiKeyExpiryCheck,
  runApiKeyLimitCheck,
} from "./api-key-alerts.service.js";

const resetAllMocks = () => {
  apiKeyFindManyMock.mockReset();
  apiKeyUpdateMock.mockReset();
  inferenceRequestAggregateMock.mockReset();
  activityLogMock.mockReset();
  enqueueEmailMock.mockReset();
  transactionMock.mockReset();
  transactionMock.mockImplementation(async (callback: any) =>
    callback({ apiKey: { update: apiKeyUpdateMock } })
  );
};

describe("runApiKeyExpiryCheck", () => {
  beforeEach(resetAllMocks);

  it("sends exactly one warning for a key expiring within the window, not yet alerted", async () => {
    const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    apiKeyFindManyMock.mockResolvedValue([
      {
        id: "key-1",
        name: "My Key",
        keyPrefix: "mb_live_abc",
        expiresAt,
        userId: "user-1",
        user: { email: "owner@example.com" },
      },
    ]);

    const result = await runApiKeyExpiryCheck();

    expect(result.alertedKeys).toBe(1);
    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com", subject: expect.stringContaining("expires soon") })
    );
    expect(apiKeyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-1" },
        data: expect.objectContaining({ expiryAlertSentAt: expect.any(Date) }),
      })
    );
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "API_KEY_EXPIRY_WARNING_SENT" }),
      expect.anything()
    );
  });

  it("queries only ACTIVE, not-yet-alerted keys within the configured warning window", async () => {
    apiKeyFindManyMock.mockResolvedValue([]);

    await runApiKeyExpiryCheck();

    expect(apiKeyFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          isDeleted: false,
          expiryAlertSentAt: null,
          expiresAt: expect.objectContaining({ gte: expect.any(Date), lte: expect.any(Date) }),
        }),
      })
    );
  });

  it("does nothing when there are no candidates (query already excludes INACTIVE/REVOKED/EXPIRED and already-alerted keys)", async () => {
    apiKeyFindManyMock.mockResolvedValue([]);

    const result = await runApiKeyExpiryCheck();

    expect(result.alertedKeys).toBe(0);
    expect(enqueueEmailMock).not.toHaveBeenCalled();
    expect(apiKeyUpdateMock).not.toHaveBeenCalled();
  });

  it("uses the named 7-day warning window constant", () => {
    expect(API_KEY_EXPIRY_WARNING_DAYS).toBe(7);
  });
});

describe("getPeriodStart", () => {
  const reference = new Date("2026-07-22T15:30:00.000Z"); // Wednesday

  it("DAILY resolves to start of the same UTC day", () => {
    expect(getPeriodStart(LimitType.DAILY, reference).toISOString()).toBe(
      "2026-07-22T00:00:00.000Z"
    );
  });

  it("WEEKLY resolves to the Monday of the current ISO week", () => {
    expect(getPeriodStart(LimitType.WEEKLY, reference).toISOString()).toBe(
      "2026-07-20T00:00:00.000Z"
    );
  });

  it("MONTHLY resolves to the 1st of the current month", () => {
    expect(getPeriodStart(LimitType.MONTHLY, reference).toISOString()).toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });

  it("QUATERLY resolves to the start of the current quarter", () => {
    expect(getPeriodStart(LimitType.QUATERLY, reference).toISOString()).toBe(
      "2026-07-01T00:00:00.000Z"
    );
  });

  it("YEARLY resolves to Jan 1st of the current year", () => {
    expect(getPeriodStart(LimitType.YEARLY, reference).toISOString()).toBe(
      "2026-01-01T00:00:00.000Z"
    );
  });
});

describe("runApiKeyLimitCheck", () => {
  beforeEach(resetAllMocks);

  afterEach(() => {
    vi.useRealTimers();
  });

  const buildKey = (overrides: {
    id: string;
    creditLimit: number;
    limitType: LimitType;
    limitAlertPeriodStart: Date | null;
  }) => ({
    id: overrides.id,
    name: "Limited Key",
    keyPrefix: "mb_live_xyz",
    userId: "user-1",
    creditLimit: new Prisma.Decimal(overrides.creditLimit),
    limitType: overrides.limitType,
    limitAlertPeriodStart: overrides.limitAlertPeriodStart,
    user: { email: "owner@example.com" },
  });

  it("sends when usage reaches the 80% threshold and hasn't been alerted this period", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T15:00:00.000Z"));

    apiKeyFindManyMock.mockResolvedValue([
      buildKey({ id: "key-1", creditLimit: 100, limitType: LimitType.DAILY, limitAlertPeriodStart: null }),
    ]);
    inferenceRequestAggregateMock.mockResolvedValue({ _sum: { totalCost: new Prisma.Decimal(85) } });

    const result = await runApiKeyLimitCheck();

    expect(result.alertedKeys).toBe(1);
    expect(enqueueEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "owner@example.com", subject: expect.stringContaining("limit") })
    );
    expect(apiKeyUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "key-1" },
        data: expect.objectContaining({
          limitAlertSentAt: expect.any(Date),
          limitAlertPeriodStart: new Date("2026-07-20T00:00:00.000Z"),
        }),
      })
    );
    expect(activityLogMock).toHaveBeenCalledWith(
      expect.objectContaining({ activityType: "API_KEY_LIMIT_WARNING_SENT" }),
      expect.anything()
    );
  });

  it("does not send when usage is below the 80% threshold", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T15:00:00.000Z"));

    apiKeyFindManyMock.mockResolvedValue([
      buildKey({ id: "key-1", creditLimit: 100, limitType: LimitType.DAILY, limitAlertPeriodStart: null }),
    ]);
    inferenceRequestAggregateMock.mockResolvedValue({ _sum: { totalCost: new Prisma.Decimal(50) } });

    const result = await runApiKeyLimitCheck();

    expect(result.alertedKeys).toBe(0);
    expect(enqueueEmailMock).not.toHaveBeenCalled();
  });

  it("does not resend within the same period once already alerted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T15:00:00.000Z"));

    apiKeyFindManyMock.mockResolvedValue([
      buildKey({
        id: "key-1",
        creditLimit: 100,
        limitType: LimitType.DAILY,
        limitAlertPeriodStart: new Date("2026-07-20T00:00:00.000Z"), // same period as "now"
      }),
    ]);
    inferenceRequestAggregateMock.mockResolvedValue({ _sum: { totalCost: new Prisma.Decimal(95) } });

    const result = await runApiKeyLimitCheck();

    expect(result.alertedKeys).toBe(0);
    expect(enqueueEmailMock).not.toHaveBeenCalled();
  });

  it("sends again once a new period begins, even though a previous period was already alerted", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-20T15:00:00.000Z"));

    apiKeyFindManyMock.mockResolvedValue([
      buildKey({
        id: "key-1",
        creditLimit: 100,
        limitType: LimitType.DAILY,
        limitAlertPeriodStart: new Date("2026-07-19T00:00:00.000Z"), // yesterday's period
      }),
    ]);
    inferenceRequestAggregateMock.mockResolvedValue({ _sum: { totalCost: new Prisma.Decimal(90) } });

    const result = await runApiKeyLimitCheck();

    expect(result.alertedKeys).toBe(1);
    expect(enqueueEmailMock).toHaveBeenCalledTimes(1);
  });

  it("excludes UNLIMITED / no-credit-limit keys via the query filter", async () => {
    apiKeyFindManyMock.mockResolvedValue([]);

    await runApiKeyLimitCheck();

    expect(apiKeyFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "ACTIVE",
          isDeleted: false,
          creditLimit: { not: null },
          limitType: { notIn: [LimitType.UNLIMITED] },
        }),
      })
    );
  });

  it("uses the named 80% threshold constant", () => {
    expect(API_KEY_LIMIT_ALERT_THRESHOLD_PERCENT).toBe(80);
  });
});
