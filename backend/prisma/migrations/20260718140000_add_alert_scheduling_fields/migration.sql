-- AlterEnum
ALTER TYPE "public"."ActivityType" ADD VALUE 'API_KEY_EXPIRY_WARNING_SENT';
ALTER TYPE "public"."ActivityType" ADD VALUE 'API_KEY_LIMIT_WARNING_SENT';

-- AlterTable
ALTER TABLE "public"."api_keys"
ADD COLUMN "expiry_alert_sent_at" TIMESTAMP(3),
ADD COLUMN "limit_alert_sent_at" TIMESTAMP(3),
ADD COLUMN "limit_alert_period_start" TIMESTAMP(3);
