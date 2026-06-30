import { NextFunction, Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import { ZodTypeAny } from "zod";
import type { ParsedQs } from "qs";

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

export const validateParams = <T extends ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);

    if (!result.success) {
      return sendResponse(
        res,
        false,
        result.error.flatten(),
        "Invalid request params",
        STATUS_CODES.BAD_REQUEST
      );
    }

    req.params = result.data as ParamsDictionary;
    return next();
  };
};

export const validateQuery = <T extends ZodTypeAny>(schema: T) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);

    if (!result.success) {
      return sendResponse(
        res,
        false,
        result.error.flatten(),
        "Invalid request query",
        STATUS_CODES.BAD_REQUEST
      );
    }

    Object.defineProperty(req, "query", {
      value: result.data as ParsedQs,
      writable: true,
      configurable: true,
      enumerable: true,
    });

    return next();
  };
};
