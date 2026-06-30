import { Request, Response, NextFunction } from "express";
import { WalletStatus } from "@prisma/client";

import prisma from "../../../prisma.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";

const PLATFORM_FEE_PERCENT = 7;
const AVG_CHARS_PER_TOKEN = 2.5;
export const checkCredits = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { model, messages, max_tokens } = req.body;

    const user = (req as any).user;
    const requestSummary = {
      userId: user?.id ?? null,
      model: model ?? null,
      messageCount: Array.isArray(messages) ? messages.length : 0,
      maxTokens: typeof max_tokens === "number" ? max_tokens : null,
    };

    console.log("[checkCredits] started", requestSummary);

    const modelRecord = await prisma.model.findFirst({
      where: {
        slug: model,
        isDeleted: false,
        isActive: true,
      },
    });

    console.log("[checkCredits] model lookup result", {
      model,
      found: Boolean(modelRecord),
      modelId: modelRecord?.id ?? null,
      modelMaxOutputTokens: modelRecord?.maxOutputTokens ?? null,
    });

    if (!modelRecord) {
      console.log("[checkCredits] exiting: requested model not found", {
        model,
      });
      return sendResponse(
        res,
        false,
        null,
        "Requested model not found",
        STATUS_CODES.NOT_FOUND
      );
    }

    if (
      typeof max_tokens === "number" &&
      modelRecord.maxOutputTokens !== null &&
      modelRecord.maxOutputTokens !== undefined &&
      max_tokens > modelRecord.maxOutputTokens
    ) {
      console.log("[checkCredits] exiting: requested max_tokens exceeds model limit", {
        requestedMaxTokens: max_tokens,
        modelMaxOutputTokens: modelRecord.maxOutputTokens,
      });
      return sendResponse(
        res,
        false,
        null,
        `Requested max_tokens exceeds model limit of ${modelRecord.maxOutputTokens}`,
        STATUS_CODES.BAD_REQUEST
      );
    }

    const maxOutputTokens =
      typeof max_tokens === "number"
        ? max_tokens
        : modelRecord.maxOutputTokens ?? 0;

    const isFreeModel = modelRecord.isFreeModel;
    const inputTokenPrice = Number(modelRecord.inputPricePerToken ?? 0);
    const outputTokenPrice = Number(modelRecord.outputPricePerToken ?? 0);
    let estimatedPromptTokens = 0;
    let estimatedInputCost = 0;
    let estimatedOutputCost = 0;
    let estimatedCost = 0;
    let platformFee = 0;
    let totalEstimatedCost = 0;

    if (!isFreeModel) {
      const promptText =
        messages
          ?.map((message: any) => {
            if (typeof message.content === "string") {
              return message.content;
            }

            return "";
          })
          .join(" ") || "";

      estimatedPromptTokens = Math.ceil(promptText.length / AVG_CHARS_PER_TOKEN);
      estimatedInputCost = estimatedPromptTokens * inputTokenPrice;
      estimatedOutputCost = maxOutputTokens * outputTokenPrice;
      estimatedCost = estimatedInputCost + estimatedOutputCost;
      platformFee = (estimatedCost * PLATFORM_FEE_PERCENT) / 100;
      totalEstimatedCost = estimatedCost + platformFee;

      console.log("[checkCredits] prompt estimation", {
        promptLengthChars: promptText.length,
        avgCharsPerToken: AVG_CHARS_PER_TOKEN,
        estimatedPromptTokens,
      });

      console.log("[checkCredits] cost estimation", {
        estimatedPromptTokens,
        maxOutputTokens,
        inputTokenPrice,
        outputTokenPrice,
        estimatedInputCost,
        estimatedOutputCost,
        estimatedCost,
        platformFee,
        totalEstimatedCost,
        isFreeModel,
      });
    } else {
      console.log("[checkCredits] free model detected, skipping token and cost estimation", {
        model,
        modelId: modelRecord.id,
        maxOutputTokens,
      });

      console.log("[checkCredits] cost estimation", {
        estimatedPromptTokens,
        maxOutputTokens,
        inputTokenPrice,
        outputTokenPrice,
        estimatedInputCost,
        estimatedOutputCost,
        estimatedCost,
        platformFee,
        totalEstimatedCost,
        isFreeModel,
      });
    }

    const creditCheck = {
      estimatedPromptTokens,
      maxOutputTokens,
      estimatedInputCost,
      estimatedOutputCost,
      platformFee,
      platformMarkupPercent: isFreeModel ? 0 : PLATFORM_FEE_PERCENT,
      totalEstimatedCost,
      isFreeModel,
    };

    if (!isFreeModel) {
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
          null,
          `Insufficient credits. Required: $${creditCheck.totalEstimatedCost.toFixed(
            6
          )}`,
          STATUS_CODES.PAYMENT_REQUIRED
        );
      }
    }

    (req as any).creditCheck = creditCheck;

    console.log("[checkCredits] passed", {
      userId: user?.id ?? null,
      model,
      totalEstimatedCost: creditCheck.totalEstimatedCost,
      isFreeModel,
    });

    next();
  } catch (error: any) {
    console.error(
      "Check Credits Middleware Error:",
      error
    );

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
