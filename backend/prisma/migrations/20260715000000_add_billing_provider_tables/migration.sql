-- CreateEnum
CREATE TYPE "public"."BillingProvider" AS ENUM ('PADDLE', 'DODO', 'STRIPE', 'RAZORPAY', 'LEMON_SQUEEZY');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'CANCELED');

-- CreateEnum
CREATE TYPE "public"."InvoiceStatus" AS ENUM ('PENDING', 'ISSUED', 'PAID', 'VOID');

-- CreateEnum
CREATE TYPE "public"."BillingWebhookStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'FAILED', 'IGNORED');

-- AlterTable
ALTER TABLE "public"."users"
ADD COLUMN "paddle_customer_id" TEXT;

-- CreateTable
CREATE TABLE "public"."payments" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "provider" "public"."BillingProvider" NOT NULL,
    "provider_transaction_id" TEXT NOT NULL,
    "provider_customer_id" TEXT,
    "invoice_id" TEXT,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."invoices" (
    "id" TEXT NOT NULL,
    "payment_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider_invoice_id" TEXT,
    "invoice_number" TEXT,
    "invoice_url" TEXT,
    "amount" DECIMAL(18,8) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "public"."InvoiceStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."billing_webhook_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "provider" "public"."BillingProvider" NOT NULL,
    "provider_event_id" TEXT NOT NULL,
    "provider_notification_id" TEXT,
    "event_type" TEXT NOT NULL,
    "signature" TEXT,
    "payload_hash" TEXT NOT NULL,
    "raw_body" TEXT NOT NULL,
    "status" "public"."BillingWebhookStatus" NOT NULL DEFAULT 'RECEIVED',
    "error_message" TEXT,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "billing_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_paddle_customer_id_key" ON "public"."users"("paddle_customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_provider_transaction_id_key" ON "public"."payments"("provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_id_key" ON "public"."payments"("invoice_id");

-- CreateIndex
CREATE INDEX "payments_user_id_created_at_idx" ON "public"."payments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_wallet_id_created_at_idx" ON "public"."payments"("wallet_id", "created_at");

-- CreateIndex
CREATE INDEX "payments_provider_status_idx" ON "public"."payments"("provider", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_payment_id_key" ON "public"."invoices"("payment_id");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_provider_invoice_id_key" ON "public"."invoices"("provider_invoice_id");

-- CreateIndex
CREATE INDEX "invoices_user_id_created_at_idx" ON "public"."invoices"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "invoices_status_created_at_idx" ON "public"."invoices"("status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_provider_event_id_key" ON "public"."billing_webhook_events"("provider_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "billing_webhook_events_provider_notification_id_key" ON "public"."billing_webhook_events"("provider_notification_id");

-- CreateIndex
CREATE INDEX "billing_webhook_events_provider_event_type_created_at_idx" ON "public"."billing_webhook_events"("provider", "event_type", "created_at");

-- CreateIndex
CREATE INDEX "billing_webhook_events_status_created_at_idx" ON "public"."billing_webhook_events"("status", "created_at");

-- AddForeignKey
ALTER TABLE "public"."payments"
ADD CONSTRAINT "payments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."payments"
ADD CONSTRAINT "payments_wallet_id_fkey"
FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices"
ADD CONSTRAINT "invoices_payment_id_fkey"
FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."invoices"
ADD CONSTRAINT "invoices_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."billing_webhook_events"
ADD CONSTRAINT "billing_webhook_events_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
