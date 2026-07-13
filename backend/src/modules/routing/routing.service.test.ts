import { ComplexityTier } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, findManyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  findManyMock: vi.fn(),
}));

vi.mock("../../../prisma.js", () => ({
  default: {
    model: {
      findFirst: findFirstMock,
      findMany: findManyMock,
    },
  },
}));

import {
  capTierForFreeTierProject,
  FREE_TIER_CAP,
  resolveAutoRoutedModel,
  TIER_MODEL_MAP,
} from "./routing.service.js";

describe("capTierForFreeTierProject", () => {
  it("never lets a FREE-tier project exceed FREE_TIER_CAP", () => {
    expect(capTierForFreeTierProject(ComplexityTier.COMPLEX, true)).toBe(FREE_TIER_CAP);
    expect(capTierForFreeTierProject(ComplexityTier.REASONING, true)).toBe(FREE_TIER_CAP);
    expect(capTierForFreeTierProject(ComplexityTier.SIMPLE, true)).toBe(ComplexityTier.SIMPLE);
  });

  it("does not cap PAYG/SCALE projects", () => {
    expect(capTierForFreeTierProject(ComplexityTier.REASONING, false)).toBe(ComplexityTier.REASONING);
  });
});

describe("resolveAutoRoutedModel — FREE_TIER_CAP composes with the isFreeModel gate", () => {
  beforeEach(() => {
    findFirstMock.mockReset();
    findManyMock.mockReset();
  });

  it("a FREE-tier project classified COMPLEX never resolves above the MEDIUM-tier model", async () => {
    findFirstMock.mockResolvedValue({ slug: TIER_MODEL_MAP[ComplexityTier.MEDIUM], isFreeModel: true });

    const result = await resolveAutoRoutedModel(ComplexityTier.COMPLEX, true);

    expect(result.effectiveTier).toBe(ComplexityTier.MEDIUM);
    expect(result.slug).toBe(TIER_MODEL_MAP[ComplexityTier.MEDIUM]);
    expect(result.isFreeModel).toBe(true);
    // Never the COMPLEX-tier (paid) model.
    expect(result.slug).not.toBe(TIER_MODEL_MAP[ComplexityTier.COMPLEX]);
  });

  it("a FREE-tier project classified REASONING never resolves above the MEDIUM-tier model", async () => {
    findFirstMock.mockResolvedValue({ slug: TIER_MODEL_MAP[ComplexityTier.MEDIUM], isFreeModel: true });

    const result = await resolveAutoRoutedModel(ComplexityTier.REASONING, true);

    expect(result.effectiveTier).toBe(ComplexityTier.MEDIUM);
    expect(result.slug).not.toBe(TIER_MODEL_MAP[ComplexityTier.REASONING]);
  });

  it("falls back to the free-tier pool instead of ever serving a paid model, if the mapped tier model isn't free-eligible", async () => {
    // Simulates a misconfigured TIER_MODEL_MAP entry that points at a paid model.
    findFirstMock.mockResolvedValue({ slug: TIER_MODEL_MAP[ComplexityTier.MEDIUM], isFreeModel: false });
    findManyMock.mockResolvedValue([
      { id: "free-1", slug: "some-other-free-model", inputPricePerToken: 0, outputPricePerToken: 0 },
    ]);

    const result = await resolveAutoRoutedModel(ComplexityTier.MEDIUM, true);

    expect(result.isFreeModel).toBe(true);
    expect(result.slug).toBe("some-other-free-model");
  });

  it("does not cap a PAYG project — REASONING resolves to the REASONING-tier model", async () => {
    findFirstMock.mockResolvedValue({ slug: TIER_MODEL_MAP[ComplexityTier.REASONING], isFreeModel: false });

    const result = await resolveAutoRoutedModel(ComplexityTier.REASONING, false);

    expect(result.effectiveTier).toBe(ComplexityTier.REASONING);
    expect(result.slug).toBe(TIER_MODEL_MAP[ComplexityTier.REASONING]);
  });
});
