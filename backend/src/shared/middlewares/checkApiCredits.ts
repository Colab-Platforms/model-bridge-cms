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

    const modelRecord = await prisma.model.findFirst({
      where: {
        slug: model,
        isDeleted: false,
        isActive: true,
      },
    });

    if (!modelRecord) {
      return sendResponse(
        res,
        false,
        null,
        "Requested model not found",
        STATUS_CODES.NOT_FOUND
      );
    }

    const promptText =
      messages
        ?.map((message: any) => {
          if (typeof message.content === "string") {
            return message.content;
          }

          return "";
        })
        .join(" ") || "";

    const estimatedPromptTokens = Math.ceil(
      promptText.length / AVG_CHARS_PER_TOKEN
    );

    if (
      typeof max_tokens === "number" &&
      modelRecord.maxOutputTokens !== null &&
      modelRecord.maxOutputTokens !== undefined &&
      max_tokens > modelRecord.maxOutputTokens
    ) {
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

    const inputTokenPrice = Number(modelRecord.inputPricePerToken ?? 0);
    const outputTokenPrice = Number(modelRecord.outputPricePerToken ?? 0);

    const estimatedInputCost =
      estimatedPromptTokens *
      Number(inputTokenPrice);

    const estimatedOutputCost =
      maxOutputTokens *
      Number(outputTokenPrice);

    const estimatedCost =
      estimatedInputCost +
      estimatedOutputCost;

    const platformFee =
      (estimatedCost * PLATFORM_FEE_PERCENT) / 100;

    const totalEstimatedCost =
      estimatedCost + platformFee;

    const wallet = await prisma.wallet.findFirst({
      where: {
        userId: user.id,
        isDeleted: false,
      },
    });

    if (!wallet) {
      return sendResponse(
        res,
        false,
        null,
        "Wallet not found",
        STATUS_CODES.NOT_FOUND
      );
    }

    if (wallet.status !== WalletStatus.ACTIVE) {
      return sendResponse(
        res,
        false,
        null,
        "Wallet is inactive",
        STATUS_CODES.FORBIDDEN
      );
    }

    if (
      Number(wallet.balance) <
      totalEstimatedCost
    ) {
      return sendResponse(
        res,
        false,
        null,
        `Insufficient credits. Required: $${totalEstimatedCost.toFixed(
          6
        )}`,
        STATUS_CODES.PAYMENT_REQUIRED
      );
    }

    (req as any).creditCheck = {
      estimatedPromptTokens,
      maxOutputTokens,
      estimatedInputCost,
      estimatedOutputCost,
      platformFee,
      platformMarkupPercent: PLATFORM_FEE_PERCENT,
      totalEstimatedCost,
    };

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
