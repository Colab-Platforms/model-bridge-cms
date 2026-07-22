-- requested_model_slug drifted back to TEXT[] yet again (external db push / stash-pop
-- merge against this shared DB using a stale schema). Verified before this migration:
-- zero non-null rows exist, so this conversion is a pure no-op on data.
ALTER TABLE "inference_requests"
  ALTER COLUMN "requested_model_slug" TYPE TEXT USING "requested_model_slug"[1];
