import { PlanTier, ComplexityTier } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findManyMock, tierRoutingModelFindFirstMock, classifyComplexityMock } = vi.hoisted(() => ({
  findManyMock: vi.fn(),
  tierRoutingModelFindFirstMock: vi.fn(),
  classifyComplexityMock: vi.fn(),
}));

vi.mock("../../../prisma.js", () => ({
  default: {
    model: {
      findMany: findManyMock,
    },
    tierRoutingModel: {
      findFirst: tierRoutingModelFindFirstMock,
    },
  },
}));

vi.mock("./complexity-router.js", () => ({
  classifyComplexity: classifyComplexityMock,
}));

import { resolveRoutingModel } from "./routing.middleware.js";
import { AUTO_ROUTE_SENTINEL, FREE_ROUTE_SENTINEL } from "./routing.constants.js";

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

describe("resolveRoutingModel — explicit model requests", () => {
  beforeEach(() => {
    tierRoutingModelFindFirstMock.mockReset();
    findManyMock.mockReset();
    classifyComplexityMock.mockReset();
  });

  it.each([PlanTier.FREE, PlanTier.PAYG, PlanTier.SCALE])(
    "passes an explicit model request straight through regardless of planTier (%s)",
    async (planTier) => {
      const req = buildReq(planTier, "gpt-5");
      const res = buildRes();
      const next = vi.fn() as unknown as NextFunction;

      await resolveRoutingModel(req, res, next);

      // No 403, no plan-tier gate — access control here is gone. Whether this
      // request actually proceeds is checkApiCredits.ts's call (wallet vs. cost),
      // not this middleware's.
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
      expect((req as any).routingMeta).toMatchObject({
        requestedModelSlug: "gpt-5",
        routingReason: "EXPLICIT_MODEL",
      });
      expect(tierRoutingModelFindFirstMock).not.toHaveBeenCalled();
      expect(findManyMock).not.toHaveBeenCalled();
    }
  );
});

describe("resolveRoutingModel — free model routing (model: 'free')", () => {
  beforeEach(() => {
    tierRoutingModelFindFirstMock.mockReset();
    findManyMock.mockReset();
    classifyComplexityMock.mockReset();
  });

  it("resolves to the cheapest active free model", async () => {
    findManyMock.mockResolvedValue([
      { id: "free-1", slug: "nemotron-nano-9b-v2:free", inputPricePerToken: 0.0001, outputPricePerToken: 0.0002 },
      { id: "free-2", slug: "higher-free-cost", inputPricePerToken: 0.0005, outputPricePerToken: 0.0005 }
    ]);

    const req = buildReq(PlanTier.FREE, FREE_ROUTE_SENTINEL);
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    await resolveRoutingModel(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.model).toBe("nemotron-nano-9b-v2:free");
    expect((req as any).routingMeta).toMatchObject({
      requestedModelSlug: FREE_ROUTE_SENTINEL,
      routingReason: "explicit free-route: cheapest active free model (cost=$0.0001)",
    });

    // Complexity classifier must NOT be called
    expect(classifyComplexityMock).not.toHaveBeenCalled();

    // Verify correct sorting query parameters were passed to Prisma
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isFreeModel: true,
          isActive: true,
          isDeleted: false,
        }),
        orderBy: [
          { inputPricePerToken: "asc" },
          { outputPricePerToken: "asc" },
        ],
      })
    );
  });

  it("throws a clear 500 error when no free models are active", async () => {
    findManyMock.mockResolvedValue([]);

    const req = buildReq(PlanTier.FREE, FREE_ROUTE_SENTINEL);
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    await resolveRoutingModel(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        message: "No free models are currently available",
      })
    );
  });
});

describe("resolveRoutingModel — auto model routing (model: 'auto')", () => {
  beforeEach(() => {
    tierRoutingModelFindFirstMock.mockReset();
    findManyMock.mockReset();
    classifyComplexityMock.mockReset();
  });

  it("still classifies and routes via the TierRoutingModel table exactly as before, now unaffected by planTier", async () => {
    classifyComplexityMock.mockReturnValue({
      tier: ComplexityTier.REASONING,
      score: 0.85,
      signals: ["reasoning keyword"],
    });

    const mappedSlug = "o4-mini";
    tierRoutingModelFindFirstMock.mockResolvedValue({ model: { slug: mappedSlug, isFreeModel: false } });

    // Test on FREE plan (which under old logic would be capped or rejected, but now goes straight through)
    const req = buildReq(PlanTier.FREE, AUTO_ROUTE_SENTINEL);
    const res = buildRes();
    const next = vi.fn() as unknown as NextFunction;

    await resolveRoutingModel(req, res, next);

    expect(classifyComplexityMock).toHaveBeenCalledTimes(1);
    expect(tierRoutingModelFindFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tier: ComplexityTier.REASONING,
          isActive: true,
        }),
        orderBy: { priority: "asc" },
      })
    );
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body.model).toBe(mappedSlug);
    expect((req as any).routingMeta).toMatchObject({
      requestedModelSlug: AUTO_ROUTE_SENTINEL,
      complexityTier: ComplexityTier.REASONING,
      complexityScore: 0.85,
      routingReason: `AUTO_COMPLEXITY_ROUTE tier=REASONING score=0.850 | reasoning keyword`,
    });
  });
});
