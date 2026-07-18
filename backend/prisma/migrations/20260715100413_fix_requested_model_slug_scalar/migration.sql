-- The live column had drifted to TEXT[] while schema.prisma (and all application
-- code) always treated requestedModelSlug as a scalar string. Every existing
-- non-null value is a single-element array, so this is a lossless conversion.
ALTER TABLE "inference_requests"
  ALTER COLUMN "requested_model_slug" TYPE TEXT USING "requested_model_slug"[1];
