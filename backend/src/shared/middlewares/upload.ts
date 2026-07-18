import multer from "multer";
import type { NextFunction, Request, Response } from "express";

import AppError from "../errors/index.js";
import STATUS_CODES from "../../utils/statusCodes.js";

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, matches the frontend's stated limit

const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
]);

const storage = multer.memoryStorage();

const attachmentUpload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE_BYTES, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(new Error(`Unsupported file type: ${file.mimetype}`));
      return;
    }
    callback(null, true);
  },
});

/** Wraps multer's single-file upload so size/type errors surface as a 400 AppError. */
export const attachmentUploadMiddleware = (fieldName: string) => {
  const handler = attachmentUpload.single(fieldName);

  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        next(new AppError("Attachment exceeds the 10MB limit", STATUS_CODES.BAD_REQUEST));
        return;
      }

      const message = err instanceof Error ? err.message : "Attachment upload failed";
      next(new AppError(message, STATUS_CODES.BAD_REQUEST));
    });
  };
};
