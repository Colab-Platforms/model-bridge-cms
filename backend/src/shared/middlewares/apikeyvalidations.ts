import { ApiKeyStatus, UserStatus } from "@prisma/client";
import { Request, Response, NextFunction } from "express";
import crypto from "crypto";

import prisma from "../../../prisma.js";
import { sendResponse } from "../../utils/responseUtils.js";
import STATUS_CODES from "../../utils/statusCodes.js";

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
