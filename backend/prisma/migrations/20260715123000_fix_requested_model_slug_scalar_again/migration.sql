-- requested_model_slug drifted back to TEXT[] after migration 20260715100413 (external
-- db push against this shared DB, using a stale schema). schema.prisma has always
-- declared this field as scalar String — re-applying the same lossless conversion.
-- Verified before this migration: only 2 non-null rows exist, both single-element.
ALTER TABLE "inference_requests"
  ALTER COLUMN "requested_model_slug" TYPE TEXT USING "requested_model_slug"[1];
