import { v2 as cloudinary } from "cloudinary";

import AppError from "../shared/errors/index.js";
import STATUS_CODES from "../utils/statusCodes.js";

const isCloudinaryConfigured = () =>
  Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
  );

const configureCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    throw new AppError(
      "File upload is not configured. Missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET",
      STATUS_CODES.SERVER_ERROR
    );
  }

  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
};

export interface UploadedFile {
  url: string;
  bytes: number;
}

/** Uploads an arbitrary file buffer (image, PDF, doc, ...) to Cloudinary under `folder`. */
export const uploadFile = async (
  buffer: Buffer,
  folder: string,
  publicId: string
): Promise<UploadedFile> => {
  configureCloudinary();

  return new Promise<UploadedFile>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        public_id: publicId,
        resource_type: "auto",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new AppError("File upload failed", STATUS_CODES.SERVER_ERROR));
          return;
        }

        resolve({ url: result.secure_url, bytes: result.bytes });
      }
    );

    stream.end(buffer);
  });
};
