-- CreateEnum
CREATE TYPE "PlanTier" AS ENUM ('FREE', 'PAYG', 'SCALE');

-- AlterTable
ALTER TABLE "inference_requests" ADD COLUMN     "downgraded_from_model_slug" TEXT,
ADD COLUMN     "routed_tier" "PlanTier",
ADD COLUMN     "routing_reason" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "plan_tier" "PlanTier" NOT NULL DEFAULT 'FREE';
