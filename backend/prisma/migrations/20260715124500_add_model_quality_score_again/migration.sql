-- quality_score was dropped from "models" again (external db push against this shared
-- DB using a stale schema, reverting the first fix from migration 20260714132707).
-- Re-adding — nullable, no default, so this is a no-op for existing rows.
ALTER TABLE "models" ADD COLUMN "quality_score" DOUBLE PRECISION;
