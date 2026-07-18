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
 * Cheapest active free model in the pool. Not currently called anywhere — it backed
 * FreeRouting's misconfiguration fallback in resolveAutoRoutedModel, which was
 * removed when plan-tier-based access control was replaced with pure credit/wallet
 * gating. Left in place since it's a reasonable building block (e.g. a future
 * "suggest a free model" endpoint) — safe to delete if it stays unused.
 */
export const getBestFreeTierModel = async (): Promise<FreeTierModel | null> => {
  const pool = await getFreeTierModelPool();

  return pool[0] ?? null;
};

/**
 * Resolves the cheapest active free model.
 * Ordered by inputPricePerToken ascending, then outputPricePerToken ascending.
 */
export const getCheapestFreeModel = async (): Promise<FreeTierModel | null> => {
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
    orderBy: [
      { inputPricePerToken: "asc" },
      { outputPricePerToken: "asc" },
    ],
  });

  return models[0] ? toFreeTierModel(models[0]) : null;
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

export interface AutoRoutedModel {
  slug: string;
  effectiveTier: ComplexityTier;
  isFreeModel: boolean;
}

/**
 * Resolves a complexity tier to a model via the TierRoutingModel table — the DB-driven
 * replacement for the old hardcoded TIER_MODEL_MAP. Picks the lowest-priority active
 * routing row for the tier whose model is also active, so swapping a tier's model (or
 * adding a fallback at a higher priority number) is a DB edit, not a deploy.
 */
export const resolveAutoRoutedModel = async (tier: ComplexityTier): Promise<AutoRoutedModel> => {
  const routingEntry = await prisma.tierRoutingModel.findFirst({
    where: {
      tier,
      isActive: true,
      model: {
        isActive: true,
        isDeleted: false,
        provider: { isActive: true, isDeleted: false },
      },
    },
    orderBy: { priority: "asc" },
    select: { model: { select: { slug: true, isFreeModel: true } } },
  });

  if (!routingEntry) {
    throw new AppError(
      `No active routing model configured for tier ${tier}`,
      STATUS_CODES.SERVER_ERROR
    );
  }

  return {
    slug: routingEntry.model.slug,
    effectiveTier: tier,
    isFreeModel: routingEntry.model.isFreeModel,
  };
};
