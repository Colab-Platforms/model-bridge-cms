-- quality_score dropped from "models" yet again (external db push / stash-pop merge
-- against this shared DB using a stale schema). Nullable, no default, no-op for
-- existing rows.
ALTER TABLE "models" ADD COLUMN "quality_score" DOUBLE PRECISION;
