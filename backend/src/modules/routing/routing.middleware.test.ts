import { PlanTier } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock } = vi.hoisted(() => {
  // TIER_RESTRICTIONS_ENABLED is read once at module-import time — this file tests
  // the enforcement logic itself, so it needs the flag on. The default-off behavior
  // (no payment gateway yet) is covered separately in
  // routing.middleware.tier-restrictions-disabled.test.ts, in its own module load.
  process.env.ENABLE_TIER_RESTRICTIONS = "true";
  return { findFirstMock: vi.fn() };
});

vi.mock("../../../prisma.js", () => ({
  default: {
    model: {
      findFirst: findFirstMock,
    },
  },
}));

import { resolveRoutingModel } from "./routing.middleware.js";

const buildReq = (planTier: PlanTier, model: string) =>
  ({
    body: { model, messages: [{ role: "user", content: "hi" }] },
    project: { id: "project-1", planTier },
  }) as unknown as Request;

const buildRes = () => {
  const res = {} as Response;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("resolveRoutingModel — FreeRouting", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("allows a FREE-tier project to request a free-tier-eligible model", async () => {
    findFirstMock.mockResolvedValue({ isFreeModel: true });

    const req = buildReq(PlanTier.FREE, "free-model");
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    await resolveRoutingModel(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect((req as any).routingMeta).toMatchObject({
      requestedModelSlug: "free-model",
      routingReason: "EXPLICIT_MODEL_FREE_TIER",
    });
  });

  it("rejects a FREE-tier project requesting a paid model with 403", async () => {
    findFirstMock.mockResolvedValue({ isFreeModel: false });

    const req = buildReq(PlanTier.FREE, "gpt-5");
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    await resolveRoutingModel(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        message: expect.stringContaining("Free plan"),
      })
    );
  });

  it("does not restrict a PAYG-tier project requesting any model", async () => {
    findFirstMock.mockResolvedValue({ isFreeModel: false });

    const req = buildReq(PlanTier.PAYG, "gpt-5");
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    await resolveRoutingModel(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect((req as any).routingMeta).toMatchObject({
      requestedModelSlug: "gpt-5",
      routingReason: "EXPLICIT_MODEL",
    });
  });
});
