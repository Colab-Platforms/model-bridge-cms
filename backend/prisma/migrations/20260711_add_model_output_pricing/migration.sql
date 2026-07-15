CREATE TYPE "ModelOutputPricingUnit" AS ENUM ('TOKEN', 'IMAGE');

ALTER TABLE "models"
ADD COLUMN "output_pricing_unit" "ModelOutputPricingUnit" NOT NULL DEFAULT 'TOKEN',
ADD COLUMN "image_output_price" DECIMAL(18, 8);

UPDATE "models"
SET
  "output_pricing_unit" = 'IMAGE',
  "image_output_price" = 0.03900000
WHERE "slug" = 'gemini-2.5-flash-image';
