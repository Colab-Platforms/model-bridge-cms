import { PlanTier } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock } = vi.hoisted(() => {
  // Deliberately NOT setting ENABLE_TIER_RESTRICTIONS — this file exercises the
  // real default (unset/false): no payment gateway yet, so the 403 gate and the
  // FREE_TIER_CAP must both be inert until that env var is flipped to "true".
  delete process.env.ENABLE_TIER_RESTRICTIONS;
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

describe("resolveRoutingModel — TIER_RESTRICTIONS_ENABLED=false (default, no payment gateway yet)", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
  });

  it("does not 403 a FREE-tier project requesting a paid model", async () => {
    findFirstMock.mockResolvedValue({ isFreeModel: false });

    const req = buildReq(PlanTier.FREE, "gpt-5");
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    await resolveRoutingModel(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect((req as any).routingMeta).toMatchObject({
      requestedModelSlug: "gpt-5",
      routingReason: "EXPLICIT_MODEL",
    });
    // Enforcement is off entirely — the middleware shouldn't even need to look the model up.
    expect(findFirstMock).not.toHaveBeenCalled();
  });
});
