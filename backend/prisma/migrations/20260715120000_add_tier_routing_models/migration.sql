-- CreateTable
CREATE TABLE "tier_routing_models" (
    "id" TEXT NOT NULL,
    "tier" "ComplexityTier" NOT NULL,
    "model_id" TEXT NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tier_routing_models_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tier_routing_models_tier_model_id_key" ON "tier_routing_models"("tier", "model_id");

-- CreateIndex
CREATE INDEX "tier_routing_models_tier_priority_idx" ON "tier_routing_models"("tier", "priority");

-- AddForeignKey
ALTER TABLE "tier_routing_models" ADD CONSTRAINT "tier_routing_models_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
