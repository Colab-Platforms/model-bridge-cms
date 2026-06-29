import { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../../utils/responseUtils.js';
import STATUS_CODES from '../../utils/statusCodes.js';

const serializeError = (err: any) => {
  if (!err || typeof err !== "object") {
    return err ?? null;
  }

  return {
    name: err.name,
    message: err.message,
    statusCode: err.statusCode,
    provider: err.provider,
    retryable: err.retryable,
    details: err.details,
    stack: err.stack,
  };
};

export const errorHandler = async (err: any, _req: Request, res: Response, _next: NextFunction): Promise<void> => {
  console.error("Error Handler Middleware:", err);

  if (res.headersSent) {
    if (!res.writableEnded) {
      res.end();
    }
    return;
  }

  sendResponse(
    res,
    false,
    serializeError(err),
    err?.message ?? "Internal server error",
    err?.statusCode ?? STATUS_CODES.SERVER_ERROR
  );
};
