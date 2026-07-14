import { ComplexityTier } from "@prisma/client";

import prisma from "../../../prisma.js";
import AppError from "../../shared/errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";

export interface FreeTierModel {
  id: string;
  slug: string;
  inputPricePerToken: number;
  outputPricePerToken: number;
}

const FREE_TIER_MODEL_SELECT = {
  id: true,
  slug: true,
  inputPricePerToken: true,
  outputPricePerToken: true,
} as const;

const toFreeTierModel = (model: {
  id: string;
  slug: string;
  inputPricePerToken: unknown;
  outputPricePerToken: unknown;
}): FreeTierModel => ({
  id: model.id,
  slug: model.slug,
  inputPricePerToken: Number(model.inputPricePerToken ?? 0),
  outputPricePerToken: Number(model.outputPricePerToken ?? 0),
});

/** All active, free-tier-eligible models (Model.isFreeModel = true). */
export const getFreeTierModelPool = async (): Promise<FreeTierModel[]> => {
  const models = await prisma.model.findMany({
    where: {
      isFreeModel: true,
      isActive: true,
      isDeleted: false,
      provider: {
        isActive: true,
        isDeleted: false,
      },
    },
    select: FREE_TIER_MODEL_SELECT,
    orderBy: {
      outputPricePerToken: "asc",
    },
  });

  return models.map(toFreeTierModel);
};

/**
 * The model to use as the default for FREE-tier "auto" requests. Free models are
 * priced at $0, so "best" here just means the pool's first entry — kept as its own
 * function so the selection heuristic (currently: none, arbitrary stable order) can
 * be swapped for a quality ranking later without touching call sites.
 */
export const getBestFreeTierModel = async (): Promise<FreeTierModel | null> => {
  const pool = await getFreeTierModelPool();

  return pool[0] ?? null;
};

/**
 * Picks another free-tier model to retry against after `excludeModelId`'s provider
 * failed. Never returns a paid model — if the free-tier pool only has the one that
 * just failed, there is nothing left to fall back to and this returns null.
 */
export const getNextFreeTierFallback = async (
  excludeModelId: string
): Promise<FreeTierModel | null> => {
  const pool = await getFreeTierModelPool();

  return pool.find((model) => model.id !== excludeModelId) ?? null;
};

/** FREE-tier projects never get auto-routed above this tier, no matter how the prompt classifies. */
export const FREE_TIER_CAP: ComplexityTier = ComplexityTier.MEDIUM;

const COMPLEXITY_TIER_ORDER: ComplexityTier[] = [
  ComplexityTier.SIMPLE,
  ComplexityTier.MEDIUM,
  ComplexityTier.COMPLEX,
  ComplexityTier.REASONING,
];

/**
 * Auto-routing target model per complexity tier. SIMPLE and MEDIUM point at
 * free-tier-eligible models on purpose: FREE_TIER_CAP means FREE-tier projects can
 * land on either of those two, and resolveAutoRoutedModel below still verifies
 * isFreeModel at resolve time rather than trusting this map blindly.
 *
 * This is a snapshot of this deployment's model catalog — review these slugs when
 * the catalog changes. If a slug here stops resolving to an active model,
 * resolveAutoRoutedModel throws for COMPLEX/REASONING rather than failing silently;
 * for SIMPLE/MEDIUM on a FREE-tier project it falls back to getBestFreeTierModel().
 */
export const TIER_MODEL_MAP: Record<ComplexityTier, string> = {
  [ComplexityTier.SIMPLE]: "nemotron-nano-9b-v2:free",
  [ComplexityTier.MEDIUM]: "nemotron-3-nano-30b-a3b:free",
  [ComplexityTier.COMPLEX]: "gpt-4o-mini",
  [ComplexityTier.REASONING]: "o4-mini",
};

/** Clamps `tier` down to FREE_TIER_CAP for FREE-tier projects; a no-op for PAYG/SCALE. */
export const capTierForFreeTierProject = (
  tier: ComplexityTier,
  isFreeTierProject: boolean
): ComplexityTier => {
  if (!isFreeTierProject) {
    return tier;
  }

  const capIndex = COMPLEXITY_TIER_ORDER.indexOf(FREE_TIER_CAP);
  const tierIndex = COMPLEXITY_TIER_ORDER.indexOf(tier);

  return tierIndex > capIndex ? FREE_TIER_CAP : tier;
};

export interface AutoRoutedModel {
  slug: string;
  effectiveTier: ComplexityTier;
  isFreeModel: boolean;
}

/**
 * Resolves a complexity tier to a concrete model. Composes with the isFreeModel gate
 * rather than bypassing it: a FREE-tier project is capped to FREE_TIER_CAP first, and
 * if TIER_MODEL_MAP's entry for the (capped) tier turns out not to be free-tier
 * -eligible — a catalog misconfiguration — this falls back to getBestFreeTierModel()
 * instead of ever handing a FREE-tier project a paid model.
 */
export const resolveAutoRoutedModel = async (
  tier: ComplexityTier,
  isFreeTierProject: boolean
): Promise<AutoRoutedModel> => {
  const effectiveTier = capTierForFreeTierProject(tier, isFreeTierProject);
  const mappedSlug = TIER_MODEL_MAP[effectiveTier];

  const modelRecord = await prisma.model.findFirst({
    where: {
      slug: mappedSlug,
      isActive: true,
      isDeleted: false,
    },
    select: { slug: true, isFreeModel: true },
  });

  if (isFreeTierProject && (!modelRecord || !modelRecord.isFreeModel)) {
    const fallback = await getBestFreeTierModel();

    if (!fallback) {
      throw new AppError("No free-tier models are currently available", STATUS_CODES.SERVER_ERROR);
    }

    return { slug: fallback.slug, effectiveTier, isFreeModel: true };
  }

  if (!modelRecord) {
    throw new AppError(
      `Auto-routing target model "${mappedSlug}" for tier ${effectiveTier} is not available`,
      STATUS_CODES.SERVER_ERROR
    );
  }

  return { slug: modelRecord.slug, effectiveTier, isFreeModel: modelRecord.isFreeModel };
};
