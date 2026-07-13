-- CreateEnum
CREATE TYPE "ComplexityTier" AS ENUM ('SIMPLE', 'MEDIUM', 'COMPLEX', 'REASONING');

-- AlterTable
ALTER TABLE "inference_requests" ADD COLUMN     "complexity_score" DOUBLE PRECISION,
ADD COLUMN     "complexity_tier" "ComplexityTier";

