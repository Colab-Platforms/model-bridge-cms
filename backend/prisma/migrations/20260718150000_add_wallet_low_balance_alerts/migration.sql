-- AlterEnum
ALTER TYPE "public"."ActivityType" ADD VALUE 'WALLET_LOW_BALANCE_ALERT_SENT';
ALTER TYPE "public"."ActivityType" ADD VALUE 'WALLET_LOW_BALANCE_ALERT_RESOLVED';

-- AlterTable
ALTER TABLE "public"."wallets"
ADD COLUMN "low_balance_threshold" DECIMAL(18,8) NOT NULL DEFAULT 2,
ADD COLUMN "alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "low_balance_alert_active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "last_alert_sent_at" TIMESTAMP(3),
ADD COLUMN "last_alert_resolved_at" TIMESTAMP(3);
