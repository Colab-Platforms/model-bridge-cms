import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

import STATUS_CODES from "../../utils/statusCodes.js";
import { sendResponse } from "../../utils/responseUtils.js";

export const validateBody = <T extends ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      return sendResponse(
        res,
        false,
        result.error.flatten(),
        "Invalid request data",
        STATUS_CODES.BAD_REQUEST
      );
    }

    req.body = result.data;
    return next();
  };
};