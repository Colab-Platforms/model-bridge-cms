import type { NextFunction, Request, Response } from "express";

import AppError from "../../shared/errors/index.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import { classifyComplexity } from "./complexity-router.js";
import { AUTO_ROUTE_SENTINEL, FREE_ROUTE_SENTINEL } from "./routing.constants.js";
import { resolveAutoRoutedModel, getCheapestFreeModel } from "./routing.service.js";
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

/**
 * Runs right after apiKeyAuth and before any middleware that looks the model up by
 * slug (validateRequestedModalities, checkCredits). Resolves `model: "auto"` to a
 * concrete slug via the native complexity-router.ts classifier (no external call) —
 * classifies the last user/system message and resolves the resulting tier to a model
 * via the TierRoutingModel table (routing.service.ts). Explicit model requests pass
 * through untouched, just tagged with routing metadata.
 *
 * NOTE: this used to also gate on Project.planTier — a FREE-tier project got a 403 on
 * paid models, and "auto" routing was capped to a MEDIUM tier ceiling. That
 * plan-tier-based access control has been removed; Project.planTier and the PlanTier
 * enum are kept in the schema (dormant) pending a future decision on whether tiers
 * come back for billing/subscription purposes, not access control. The only gate left
 * on whether a request proceeds is checkApiCredits.ts, later in this pipeline —
 * wallet balance vs. the resolved model's cost.
 */
export const resolveRoutingModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const requestedModel = req.body.model as string;

    if (requestedModel === FREE_ROUTE_SENTINEL) {
      const cheapestFreeModel = await getCheapestFreeModel();
      if (!cheapestFreeModel) {
        throw new AppError(
          "No free models are currently available",
          STATUS_CODES.SERVER_ERROR
        );
      }

      const routingMeta: RoutingMeta = {
        requestedModelSlug: FREE_ROUTE_SENTINEL,
        routingReason: `explicit free-route: cheapest active free model (cost=$${cheapestFreeModel.inputPricePerToken})`,
      };

      (req as any).routingMeta = routingMeta;
      req.body.model = cheapestFreeModel.slug;

      return next();
    }

    if (requestedModel === AUTO_ROUTE_SENTINEL) {
      const messages = (req.body.messages ?? []) as IncomingChatMessage[];
      const userMessage = extractLastMessageText(messages, "user");
      const systemMessage = extractLastMessageText(messages, "system");

      const classification = classifyComplexity({ userMessage, systemMessage });
      const resolved = await resolveAutoRoutedModel(classification.tier);

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

    const routingMeta: RoutingMeta = {
      requestedModelSlug: requestedModel,
      routingReason: "EXPLICIT_MODEL",
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
