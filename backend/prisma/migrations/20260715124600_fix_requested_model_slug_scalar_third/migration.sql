-- requested_model_slug drifted back to TEXT[] a second time (external db push against
-- this shared DB using a stale schema, reverting migration 20260715123000). Verified
-- before this migration: only 2 non-null rows exist, both single-element.
ALTER TABLE "inference_requests"
  ALTER COLUMN "requested_model_slug" TYPE TEXT USING "requested_model_slug"[1];
