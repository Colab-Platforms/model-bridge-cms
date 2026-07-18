import { ComplexityTier } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { tierRoutingModelFindFirstMock, findManyMock } = vi.hoisted(() => ({
  tierRoutingModelFindFirstMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("../../../prisma.js", () => ({
  default: {
    tierRoutingModel: {
      findFirst: tierRoutingModelFindFirstMock,
    },
    model: {
      findMany: findManyMock,
    },
  },
}));

import { resolveAutoRoutedModel, getCheapestFreeModel } from "./routing.service.js";

const SLUG_BY_TIER: Record<ComplexityTier, string> = {
  [ComplexityTier.SIMPLE]: "nemotron-nano-9b-v2:free",
  [ComplexityTier.MEDIUM]: "nemotron-3-nano-30b-a3b:free",
  [ComplexityTier.COMPLEX]: "gpt-4o-mini",
  [ComplexityTier.REASONING]: "o4-mini",
};

describe("resolveAutoRoutedModel — DB-driven tier-to-model lookup via TierRoutingModel", () => {
  beforeEach(() => {
    tierRoutingModelFindFirstMock.mockReset();
  });

  it.each([ComplexityTier.SIMPLE, ComplexityTier.MEDIUM, ComplexityTier.COMPLEX, ComplexityTier.REASONING])(
    "resolves %s to the lowest-priority active routing row's model",
    async (tier) => {
      const mappedSlug = SLUG_BY_TIER[tier];
      tierRoutingModelFindFirstMock.mockResolvedValue({
        model: { slug: mappedSlug, isFreeModel: tier === ComplexityTier.SIMPLE || tier === ComplexityTier.MEDIUM },
      });

      const result = await resolveAutoRoutedModel(tier);

      expect(result.slug).toBe(mappedSlug);
      expect(result.effectiveTier).toBe(tier);
      expect(tierRoutingModelFindFirstMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tier, isActive: true }),
          orderBy: { priority: "asc" },
        })
      );
    }
  );

  it("throws if no active routing row is configured for the tier, instead of failing silently", async () => {
    tierRoutingModelFindFirstMock.mockResolvedValue(null);

    await expect(resolveAutoRoutedModel(ComplexityTier.REASONING)).rejects.toThrow(
      /No active routing model configured for tier/
    );
  });
});

describe("getCheapestFreeModel", () => {
  beforeEach(() => {
    findManyMock.mockReset();
  });

  it("queries models ordered by inputPricePerToken then outputPricePerToken and returns the cheapest", async () => {
    findManyMock.mockResolvedValue([
      { id: "model-1", slug: "nemotron-nano-9b-v2:free", inputPricePerToken: 0, outputPricePerToken: 0 },
      { id: "model-2", slug: "nemotron-3-nano-30b-a3b:free", inputPricePerToken: 0.0001, outputPricePerToken: 0.0001 }
    ]);

    const result = await getCheapestFreeModel();

    expect(result).toEqual({
      id: "model-1",
      slug: "nemotron-nano-9b-v2:free",
      inputPricePerToken: 0,
      outputPricePerToken: 0
    });

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

  it("returns null if no free models exist", async () => {
    findManyMock.mockResolvedValue([]);
    const result = await getCheapestFreeModel();
    expect(result).toBeNull();
  });
});
