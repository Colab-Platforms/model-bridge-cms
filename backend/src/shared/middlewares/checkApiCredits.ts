import { Request, Response, NextFunction } from "express";

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
    const { model, messages } = req.body;

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

    const maxOutputTokens =
      modelRecord.maxOutputTokens ?? 0;

    const inputTokenPrice = Number(modelRecord.inputPricePer1m) / 1_000_000;
    const outputTokenPrice = Number(modelRecord.outputPricePer1m) / 1_000_000;

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

    const wallet = await prisma.wallet.findUnique({
      where: {
        userId: user.id,
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