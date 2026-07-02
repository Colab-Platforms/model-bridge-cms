import { Request, Response, NextFunction } from "express";
import { WalletStatus } from "@prisma/client";

import prisma from "../../../prisma.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";
import type { CreditCheckEstimate } from "../../modules/chat-completions/completions.types.js";

const PLATFORM_FEE_PERCENT = 7;
const AVG_CHARS_PER_TOKEN = 2.5;

type MessageContentPart =
  | {
      type: "text";
      text: string;
    }
  | {
      type: "image_url";
      image_url: {
        url: string;
      };
    };

type ChatCompletionMessage = {
  content: string | MessageContentPart[];
};

type CreditCheckRequestBody = {
  model: string | string[];
  messages?: ChatCompletionMessage[];
  max_tokens?: number;
};

const roundCurrency = (value: number) => Number(value.toFixed(8));

const getRequestedModels = (body: CreditCheckRequestBody) => {
  return Array.isArray(body.model) ? body.model : [body.model];
};

const extractPromptText = (messages: ChatCompletionMessage[] = []) =>
  messages
    .map((message) => {
      if (typeof message.content === "string") {
        return message.content;
      }

      return message.content
        .filter((part): part is Extract<MessageContentPart, { type: "text" }> => part.type === "text")
        .map((part) => part.text)
        .join(" ");
    })
    .filter(Boolean)
    .join(" ");

export const checkCredits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const body = req.body as CreditCheckRequestBody;
    const { messages, max_tokens } = body;
    const requestedModels = getRequestedModels(body);

    const user = (req as any).user;
    const requestSummary = {
      userId: user?.id ?? null,
      models: requestedModels,
      messageCount: Array.isArray(messages) ? messages.length : 0,
      maxTokens: typeof max_tokens === "number" ? max_tokens : null,
    };

    console.log("[checkCredits] started", requestSummary);

    if (requestedModels.length === 0) {
      return sendResponse(
        res,
        false,
        null,
        "Requested model is required",
        STATUS_CODES.BAD_REQUEST
      );
    }

    const uniqueRequestedModels = Array.from(new Set(requestedModels));
    const modelRecords = await prisma.model.findMany({
      where: {
        slug: { in: uniqueRequestedModels },
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        slug: true,
        isFreeModel: true,
        inputPricePerToken: true,
        outputPricePerToken: true,
        maxOutputTokens: true,
      },
    });

    const modelMap = new Map(modelRecords.map((modelRecord) => [modelRecord.slug, modelRecord]));
    const missingModels = requestedModels.filter((model) => !modelMap.has(model));

    console.log("[checkCredits] model lookup result", {
      requestedModels,
      foundModels: modelRecords.map((model) => model.slug),
      missingModels,
    });

    if (missingModels.length > 0) {
      return sendResponse(
        res,
        false,
        missingModels.length === 1 && requestedModels.length === 1 ? null : { missingModels },
        "Requested model not found",
        STATUS_CODES.NOT_FOUND
      );
    }

    const promptText = extractPromptText(messages ?? []);
    const estimatedPromptTokens =
      promptText.trim().length > 0 ? Math.ceil(promptText.length / AVG_CHARS_PER_TOKEN) : 0;

    console.log("[checkCredits] prompt estimation", {
      promptLengthChars: promptText.length,
      avgCharsPerToken: AVG_CHARS_PER_TOKEN,
      estimatedPromptTokens,
    });

    const modelEstimates: NonNullable<CreditCheckEstimate["modelEstimates"]> = {};
    let totalEstimatedInputCost = 0;
    let totalEstimatedOutputCost = 0;
    let totalPlatformFee = 0;
    let totalEstimatedCost = 0;
    let aggregateMaxOutputTokens = 0;
    let allModelsAreFree = true;

    for (const requestedModel of requestedModels) {
      const modelRecord = modelMap.get(requestedModel);

      if (!modelRecord) {
        continue;
      }

      if (
        typeof max_tokens === "number" &&
        modelRecord.maxOutputTokens !== null &&
        modelRecord.maxOutputTokens !== undefined &&
        max_tokens > modelRecord.maxOutputTokens
      ) {
        console.log("[checkCredits] exiting: requested max_tokens exceeds model limit", {
          requestedModel,
          requestedMaxTokens: max_tokens,
          modelMaxOutputTokens: modelRecord.maxOutputTokens,
        });

        return sendResponse(
          res,
          false,
          null,
          `Requested max_tokens exceeds model limit of ${modelRecord.maxOutputTokens} for model ${requestedModel}`,
          STATUS_CODES.BAD_REQUEST
        );
      }

      const modelMaxOutputTokens =
        typeof max_tokens === "number"
          ? max_tokens
          : modelRecord.maxOutputTokens ?? 0;
      const isFreeModel = modelRecord.isFreeModel;
      const inputTokenPrice = Number(modelRecord.inputPricePerToken ?? 0);
      const outputTokenPrice = Number(modelRecord.outputPricePerToken ?? 0);
      const estimatedInputCost = isFreeModel ? 0 : estimatedPromptTokens * inputTokenPrice;
      const estimatedOutputCost = isFreeModel ? 0 : modelMaxOutputTokens * outputTokenPrice;
      const estimatedCost = estimatedInputCost + estimatedOutputCost;
      const platformFee = isFreeModel ? 0 : (estimatedCost * PLATFORM_FEE_PERCENT) / 100;
      const totalModelEstimatedCost = estimatedCost + platformFee;

      modelEstimates[requestedModel] = {
        estimatedPromptTokens,
        maxOutputTokens: modelMaxOutputTokens,
        estimatedInputCost: roundCurrency(estimatedInputCost),
        estimatedOutputCost: roundCurrency(estimatedOutputCost),
        platformFee: roundCurrency(platformFee),
        platformMarkupPercent: isFreeModel ? 0 : PLATFORM_FEE_PERCENT,
        totalEstimatedCost: roundCurrency(totalModelEstimatedCost),
        isFreeModel,
      };

      totalEstimatedInputCost += estimatedInputCost;
      totalEstimatedOutputCost += estimatedOutputCost;
      totalPlatformFee += platformFee;
      totalEstimatedCost += totalModelEstimatedCost;
      aggregateMaxOutputTokens += modelMaxOutputTokens;
      allModelsAreFree = allModelsAreFree && isFreeModel;
    }

    const creditCheck: CreditCheckEstimate = {
      requestedModels,
      estimatedPromptTokens,
      maxOutputTokens: aggregateMaxOutputTokens,
      estimatedInputCost: roundCurrency(totalEstimatedInputCost),
      estimatedOutputCost: roundCurrency(totalEstimatedOutputCost),
      platformFee: roundCurrency(totalPlatformFee),
      platformMarkupPercent: allModelsAreFree ? 0 : PLATFORM_FEE_PERCENT,
      totalEstimatedCost: roundCurrency(totalEstimatedCost),
      isFreeModel: allModelsAreFree,
      modelEstimates,
    };

    console.log("[checkCredits] cost estimation", creditCheck);

    if (!creditCheck.isFreeModel) {
      console.log("[checkCredits] fetching wallet", {
        userId: user?.id ?? null,
      });

      const wallet = await prisma.wallet.findFirst({
        where: {
          userId: user.id,
          isDeleted: false,
        },
      });

      console.log("[checkCredits] wallet lookup result", {
        userId: user?.id ?? null,
        found: Boolean(wallet),
        walletId: wallet?.id ?? null,
        walletStatus: wallet?.status ?? null,
        walletBalance: wallet ? Number(wallet.balance) : null,
      });

      if (!wallet) {
        console.log("[checkCredits] exiting: wallet not found", {
          userId: user?.id ?? null,
        });
        return sendResponse(
          res,
          false,
          null,
          "Wallet not found",
          STATUS_CODES.NOT_FOUND
        );
      }

      if (wallet.status !== WalletStatus.ACTIVE) {
        console.log("[checkCredits] exiting: wallet inactive", {
          walletId: wallet.id,
          walletStatus: wallet.status,
        });
        return sendResponse(
          res,
          false,
          null,
          "Wallet is inactive",
          STATUS_CODES.FORBIDDEN
        );
      }

      if (Number(wallet.balance) < creditCheck.totalEstimatedCost) {
        console.log("[checkCredits] exiting: insufficient credits", {
          walletId: wallet.id,
          walletBalance: Number(wallet.balance),
          totalEstimatedCost: creditCheck.totalEstimatedCost,
          shortfall: creditCheck.totalEstimatedCost - Number(wallet.balance),
        });
        return sendResponse(
          res,
          false,
          {
            requestedModels,
            totalEstimatedCost: creditCheck.totalEstimatedCost.toFixed(8),
          },
          `Insufficient credits. Required: $${creditCheck.totalEstimatedCost.toFixed(6)}`,
          STATUS_CODES.PAYMENT_REQUIRED
        );
      }
    }

    (req as any).creditCheck = creditCheck;

    console.log("[checkCredits] passed", {
      userId: user?.id ?? null,
      requestedModels,
      totalEstimatedCost: creditCheck.totalEstimatedCost,
      isFreeModel: creditCheck.isFreeModel,
    });

    next();
  } catch (error: any) {
    console.error("Check Credits Middleware Error:", error);

    return sendResponse(
      res,
      false,
      null,
      error?.message || "Credit validation failed",
      STATUS_CODES.SERVER_ERROR
    );
  }
};

export default checkCredits;
