import { ApiKeyStatus, LimitType, UserStatus } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

import prisma from "../../../prisma.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";

const PLATFORM_FEE_PERCENT = 7;
const AVG_CHARS_PER_TOKEN = 2.5;

type ChatCompletionMessage = {
  content:
    | string
    | Array<
        | {
            type: "text";
            text: string;
          }
        | {
            type: "image_url";
            image_url: {
              url: string;
            };
          }
      >;
};

type ApiKeyLimitedRequestBody = {
  model?: string;
  messages?: ChatCompletionMessage[];
  max_tokens?: number;
};

const getLimitWindowStart = (limitType: LimitType) => {
  const now = new Date();

  switch (limitType) {
    case LimitType.DAILY:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case LimitType.WEEKLY:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case LimitType.MONTHLY:
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case LimitType.QUATERLY:
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    case LimitType.YEARLY:
      return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    default:
      return null;
  }
};

const extractPromptText = (messages: ChatCompletionMessage[] = []) =>
  messages
    .map((message) => {
      if (typeof message.content === "string") {
        return message.content;
      }

      return message.content
        .filter((part): part is Extract<ChatCompletionMessage["content"][number], { type: "text" }> => part.type === "text")
        .map((part) => part.text)
        .join(" ");
    })
    .filter(Boolean)
    .join(" ");

const estimateRequestCost = async (body: ApiKeyLimitedRequestBody) => {
  if (!body.model) {
    return 0;
  }

  const modelRecord = await prisma.model.findFirst({
    where: {
      slug: body.model,
      isDeleted: false,
      isActive: true,
    },
    select: {
      isFreeModel: true,
      inputPricePerToken: true,
      outputPricePerToken: true,
      maxOutputTokens: true,
    },
  });

  if (!modelRecord || modelRecord.isFreeModel) {
    return 0;
  }

  const promptText = extractPromptText(body.messages ?? []);
  const estimatedPromptTokens = Math.ceil(promptText.length / AVG_CHARS_PER_TOKEN);
  const requestedMaxTokens =
    typeof body.max_tokens === "number"
      ? body.max_tokens
      : modelRecord.maxOutputTokens ?? 0;

  const estimatedInputCost =
    estimatedPromptTokens * Number(modelRecord.inputPricePerToken ?? 0);
  const estimatedOutputCost =
    requestedMaxTokens * Number(modelRecord.outputPricePerToken ?? 0);
  const estimatedProviderCost = estimatedInputCost + estimatedOutputCost;
  const platformFee = (estimatedProviderCost * PLATFORM_FEE_PERCENT) / 100;

  return Number((estimatedProviderCost + platformFee).toFixed(8));
};

export const apiKeyAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return sendResponse(
        res,
        false,
        null,
        "API key is required",
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const apiKey = authHeader.split(" ")[1];

    if (!apiKey) {
      return sendResponse(
        res,
        false,
        null,
        "Invalid authorization header",
        STATUS_CODES.UNAUTHORIZED
      );
    }

    const hashedKey = crypto
      .createHash("sha256")
      .update(apiKey)
      .digest("hex");

    const apiKeyRecord = await prisma.apiKey.findUnique({
      where: {
        keyHash: hashedKey,
    },
      include: {
        user: true,
        project: true,
      },
    });

    if (!apiKeyRecord) {
      return sendResponse(
        res,
        false,
        null,
        "Invalid API key",
        STATUS_CODES.UNAUTHORIZED
      );
    }

    if (apiKeyRecord.isDeleted) {
      return sendResponse(
        res,
        false,
        null,
        "API key is deleted",
        STATUS_CODES.FORBIDDEN
      );
    }

    if (apiKeyRecord.status !== ApiKeyStatus.ACTIVE) {
        return sendResponse(
            res,
            false,
            null,
            "API key is disabled",
            STATUS_CODES.FORBIDDEN
        );
    }

    if (
      apiKeyRecord.expiresAt &&
      apiKeyRecord.expiresAt < new Date()
    ) {
      return sendResponse(
        res,
        false,
        null,
        "API key has expired",
        STATUS_CODES.FORBIDDEN
      );
    }

    if (apiKeyRecord.project?.isDeleted) {
      return sendResponse(
        res,
        false,
        null,
        "Project is deleted",
        STATUS_CODES.FORBIDDEN
      );
    }

    if (!apiKeyRecord.project?.isActive) {
      return sendResponse(
        res,
        false,
        null,
        "Project is inactive",
        STATUS_CODES.FORBIDDEN
      );
    }

    if (apiKeyRecord.user?.isDeleted) {
      return sendResponse(
        res,
        false,
        null,
        "User account is deleted",
        STATUS_CODES.FORBIDDEN
      );
    }

    if (apiKeyRecord.user?.status !== UserStatus.ACTIVE) {
      return sendResponse(
        res,
        false,
        null,
        "User account is inactive",
        STATUS_CODES.FORBIDDEN
      );
    }

    if (apiKeyRecord.creditLimit !== null && apiKeyRecord.limitType) {
      const windowStart = getLimitWindowStart(apiKeyRecord.limitType);

      if (windowStart) {
        const usageAggregate = await prisma.inferenceRequest.aggregate({
          where: {
            apiKeyId: apiKeyRecord.id,
            createdAt: {
              gte: windowStart,
            },
            totalCost: {
              not: null,
            },
          },
          _sum: {
            totalCost: true,
          },
        });

        const currentSpend = Number(usageAggregate._sum.totalCost ?? 0);
        const estimatedRequestCost = await estimateRequestCost(
          req.body as ApiKeyLimitedRequestBody
        );
        const creditLimit = Number(apiKeyRecord.creditLimit);
        const projectedSpend = currentSpend + estimatedRequestCost;

        if (projectedSpend > creditLimit) {
          return sendResponse(
            res,
            false,
            {
              limitType: apiKeyRecord.limitType,
              creditLimit: creditLimit.toFixed(8),
              currentSpend: currentSpend.toFixed(8),
              estimatedRequestCost: estimatedRequestCost.toFixed(8),
              projectedSpend: projectedSpend.toFixed(8),
            },
            `API key credit limit exceeded for the current ${apiKeyRecord.limitType.toLowerCase()} period`,
            STATUS_CODES.FORBIDDEN
          );
        }
      }
    }

    await prisma.apiKey.update({
      where: {
        id: apiKeyRecord.id,
      },
      data: {
        lastUsedAt: new Date(),
      },
    });

    (req as any).apiKey = {
      id: apiKeyRecord.id,
      name: apiKeyRecord.name,
      creditLimit: apiKeyRecord.creditLimit,
      limitType: apiKeyRecord.limitType,
    };

    (req as any).project = {
      id: apiKeyRecord.project.id,
      name: apiKeyRecord.project.name,
    };

    (req as any).user = {
      id: apiKeyRecord.user.id,
      email: apiKeyRecord.user.email,
    };

    next();
  } catch (error: any) {
    console.error("API Key Middleware Error:", error);

    return sendResponse(
      res,
      false,
      null,
      error?.message || "Authentication failed",
      STATUS_CODES.UNAUTHORIZED
    );
  }
};

export default apiKeyAuth;
