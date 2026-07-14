import { PlanTier } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";

import prisma from "../../../prisma.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { classifyComplexity } from "./complexity-router.js";
import { AUTO_ROUTE_SENTINEL } from "./routing.constants.js";
import { resolveAutoRoutedModel } from "./routing.service.js";
import type { RoutingMeta } from "./routing.types.js";

interface IncomingChatMessage {
  role: string;
  content: unknown;
}

const extractTextContent = (content: unknown): string => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .filter(
        (part): part is { type: "text"; text: string } =>
          part && typeof part === "object" && part.type === "text"
      )
      .map((part) => part.text)
      .join(" ");
  }

  return "";
};

/** Last message with the given role, text-extracted — "last" so the most recent turn dominates classification. */
const extractLastMessageText = (messages: IncomingChatMessage[], role: string): string => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === role) {
      return extractTextContent(messages[i].content);
    }
  }

  return "";
};

const FREE_PLAN_REJECTION_MESSAGE =
  "This model isn't available on the Free plan. Upgrade to Pay As You Go or Scale to use it.";

/**
 * Kill switch for FREE-tier enforcement — off by default until a payment gateway
 * exists to let a FREE project actually upgrade. `Project.planTier` keeps getting
 * written/read as normal (no schema/data changes), and the complexity-router still
 * runs for "auto" requests (cost-optimized routing keeps working) — this only turns
 * off the FREE_TIER_CAP and the 403 gate below. Flip ENABLE_TIER_RESTRICTIONS=true
 * once upgrades are possible; no code change needed at that point.
 */
const TIER_RESTRICTIONS_ENABLED = process.env.ENABLE_TIER_RESTRICTIONS === "true";

/**
 * Runs right after apiKeyAuth and before any middleware that looks the model up by
 * slug (validateRequestedModalities, checkCredits). Two responsibilities:
 *
 * 1. Resolves `model: "auto"` to a concrete slug via the native complexity-router.ts
 *    classifier (no external call) — classifies the last user/system message, maps
 *    the resulting tier to a model, and for FREE-tier projects caps the tier at
 *    FREE_TIER_CAP before that mapping happens (routing.service.ts) — only while
 *    TIER_RESTRICTIONS_ENABLED is true.
 * 2. Enforces that FREE-tier projects can only use models where Model.isFreeModel is
 *    true. This check runs on every request, including ones that name a model
 *    explicitly — not just "auto" ones — otherwise a FREE-tier project could bypass
 *    the restriction just by naming a paid model directly. Rejects with 403 rather
 *    than silently downgrading, so callers know why their request didn't go through.
 *    Only while TIER_RESTRICTIONS_ENABLED is true.
 */
export const resolveRoutingModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const project = (req as any).project as { id: string; planTier: PlanTier } | undefined;
    const isFreeTierProject = TIER_RESTRICTIONS_ENABLED && project?.planTier === PlanTier.FREE;
    const requestedModel = req.body.model as string;

    if (requestedModel === AUTO_ROUTE_SENTINEL) {
      const messages = (req.body.messages ?? []) as IncomingChatMessage[];
      const userMessage = extractLastMessageText(messages, "user");
      const systemMessage = extractLastMessageText(messages, "system");

      const classification = classifyComplexity({ userMessage, systemMessage });
      const resolved = await resolveAutoRoutedModel(classification.tier, isFreeTierProject);

      const routingMeta: RoutingMeta = {
        requestedModelSlug: AUTO_ROUTE_SENTINEL,
        routingReason: `AUTO_COMPLEXITY_ROUTE tier=${resolved.effectiveTier} score=${classification.score.toFixed(3)}${
          classification.signals.length > 0 ? ` | ${classification.signals.join("; ")}` : ""
        }`,
        complexityTier: resolved.effectiveTier,
        complexityScore: classification.score,
      };

      (req as any).routingMeta = routingMeta;
      req.body.model = resolved.slug;

      return next();
    }

    if (isFreeTierProject) {
      const modelRecord = await prisma.model.findFirst({
        where: {
          slug: requestedModel,
          isDeleted: false,
          isActive: true,
        },
        select: { isFreeModel: true },
      });

      // An unknown/inactive slug is left for validateRequestedModalities to 404 below
      // — this middleware only enforces the tier restriction on models that exist.
      if (modelRecord && !modelRecord.isFreeModel) {
        return sendResponse(
          res,
          false,
          { model: requestedModel, planTier: project?.planTier },
          FREE_PLAN_REJECTION_MESSAGE,
          STATUS_CODES.FORBIDDEN
        );
      }
    }

    const routingMeta: RoutingMeta = {
      requestedModelSlug: requestedModel,
      routingReason: isFreeTierProject ? "EXPLICIT_MODEL_FREE_TIER" : "EXPLICIT_MODEL",
    };

    (req as any).routingMeta = routingMeta;

    next();
  } catch (error: any) {
    console.error("[resolveRoutingModel] routing failed:", error);

    return sendResponse(
      res,
      false,
      null,
      error?.message || "Model routing failed",
      error?.statusCode || STATUS_CODES.SERVER_ERROR
    );
  }
};

export default resolveRoutingModel;
