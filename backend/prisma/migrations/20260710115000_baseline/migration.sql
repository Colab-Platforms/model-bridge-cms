-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."ActivityType" AS ENUM ('USER_REGISTERED', 'USER_LOGIN', 'USER_LOGOUT', 'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED', 'API_KEY_CREATED', 'API_KEY_UPDATED', 'API_KEY_REVOKED', 'WALLET_TOPUP', 'CREDIT_GRANTED', 'REFUND_ISSUED', 'USER_SUSPENDED', 'USER_ACTIVATED', 'MODEL_CREATED', 'MODEL_UPDATED', 'MODEL_DISABLED', 'PROVIDER_ENABLED', 'PROVIDER_DISABLED');

-- CreateEnum
CREATE TYPE "public"."ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'INACTIVE', 'EXPIRED', 'EXHAUSTED');

-- CreateEnum
CREATE TYPE "public"."AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "public"."LimitType" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUATERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "public"."RequestStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL', 'STOPPED', 'PENDING');

-- CreateEnum
CREATE TYPE "public"."RequestType" AS ENUM ('CHAT', 'STREAM', 'IMAGE', 'AUDIO', 'VIDEO', 'RESEARCH');

-- CreateEnum
CREATE TYPE "public"."UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."WalletStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "public"."WalletTransactionType" AS ENUM ('TOPUP', 'CREDIT_GRANT', 'USAGE_DEDUCTION', 'REFUND', 'ADJUSTMENT');

-- CreateTable
CREATE TABLE "public"."activity_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "project_id" TEXT,
    "activity_type" "public"."ActivityType" NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."api_keys" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "limitType" "public"."LimitType",
    "status" "public"."ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "expires_at" TIMESTAMP(3),
    "credit_limit" DECIMAL(18,8),

    CONSTRAINT "api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."inference_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "api_key_id" TEXT NOT NULL,
    "model_id" TEXT NOT NULL,
    "requestType" "public"."RequestType",
    "requested_model_slug" TEXT,
    "resolved_model_slug" TEXT,
    "stream" BOOLEAN,
    "status" "public"."RequestStatus",
    "response_completion_time_ms" INTEGER,
    "prompt_tokens" INTEGER,
    "completion_tokens" INTEGER,
    "total_tokens" INTEGER,
    "input_price_snapshot" DECIMAL(18,8),
    "output_price_snapshot" DECIMAL(18,8),
    "provider_cost" DECIMAL(18,8),
    "platform_markup_percent" DECIMAL(5,2),
    "platform_markup" DECIMAL(18,8),
    "total_cost" DECIMAL(18,8),
    "latency_ms" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inference_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."models" (
    "id" TEXT NOT NULL,
    "provider_id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "display_name" TEXT,
    "default_for_capabilities" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "input_modalities" TEXT[],
    "output_modalities" TEXT[],
    "context_length" INTEGER,
    "deleted_at" TIMESTAMP(3),
    "description" TEXT,
    "max_output_tokens" INTEGER,
    "supported_parameters" TEXT[],
    "tokenizer" TEXT,
    "cache_read_price_per_token" DECIMAL(18,8),
    "cache_write_price_per_token" DECIMAL(18,8),
    "input_price_per_token" DECIMAL(18,8),
    "output_price_per_token" DECIMAL(18,8),
    "is_free_model" BOOLEAN NOT NULL DEFAULT false,
    "provider_model_id" TEXT,

    CONSTRAINT "models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "slug" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "deleted_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."providers" (
    "id" TEXT NOT NULL,
    "slug" TEXT,
    "display_name" TEXT,
    "description" TEXT,
    "base_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "provider_logo" TEXT,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."request_metadata" (
    "id" TEXT NOT NULL,
    "inference_request_id" TEXT NOT NULL,
    "request_payload" JSONB,
    "response_metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "request_metadata_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isdeleted" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "device_name" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "expires_at" TIMESTAMP(3),
    "absoluteExpiresAt" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "lastUsedAt" TIMESTAMP(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."userrole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "userrole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "phone_no" TEXT,
    "country_code" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "profileImage" TEXT,
    "status" "public"."UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "google_id" TEXT,
    "auth_provider" "public"."AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "emailVerificationOtpHash" TEXT,
    "emailVerificationOtpExpiresAt" TIMESTAMP(3),
    "passwordResetOtpHash" TEXT,
    "passwordResetOtpExpiresAt" TIMESTAMP(3),
    "isGuideTaken" BOOLEAN,
    "timezone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_by" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallet_transactions" (
    "id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "inference_request_id" TEXT,
    "type" "public"."WalletTransactionType" NOT NULL,
    "amount" DECIMAL(18,8) NOT NULL,
    "balance_before" DECIMAL(18,8),
    "balance_after" DECIMAL(18,8),
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "created_by" TEXT,
    "reference_id" TEXT,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."wallets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" "public"."WalletStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" TEXT,
    "updated_by" TEXT,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "activity_logs_entity_id_idx" ON "public"."activity_logs"("entity_id" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_entity_type_idx" ON "public"."activity_logs"("entity_type" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_project_id_idx" ON "public"."activity_logs"("project_id" ASC);

-- CreateIndex
CREATE INDEX "activity_logs_user_id_idx" ON "public"."activity_logs"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "api_keys_key_hash_key" ON "public"."api_keys"("key_hash" ASC);

-- CreateIndex
CREATE INDEX "api_keys_project_id_idx" ON "public"."api_keys"("project_id" ASC);

-- CreateIndex
CREATE INDEX "api_keys_user_id_idx" ON "public"."api_keys"("user_id" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_api_key_id_created_at_idx" ON "public"."inference_requests"("api_key_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_created_at_idx" ON "public"."inference_requests"("created_at" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_model_id_created_at_idx" ON "public"."inference_requests"("model_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_model_id_idx" ON "public"."inference_requests"("model_id" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_project_id_created_at_idx" ON "public"."inference_requests"("project_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_requestType_created_at_idx" ON "public"."inference_requests"("requestType" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_status_created_at_idx" ON "public"."inference_requests"("status" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "inference_requests_user_id_created_at_idx" ON "public"."inference_requests"("user_id" ASC, "created_at" ASC);

-- CreateIndex
CREATE INDEX "models_provider_id_idx" ON "public"."models"("provider_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "models_slug_key" ON "public"."models"("slug" ASC);

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "public"."projects"("user_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "providers_slug_key" ON "public"."providers"("slug" ASC);

-- CreateIndex
CREATE INDEX "request_metadata_inference_request_id_idx" ON "public"."request_metadata"("inference_request_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "role_name_key" ON "public"."role"("name" ASC);

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "public"."sessions"("user_id" ASC);

-- CreateIndex
CREATE INDEX "userrole_roleId_idx" ON "public"."userrole"("roleId" ASC);

-- CreateIndex
CREATE INDEX "userrole_userId_idx" ON "public"."userrole"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "public"."users"("google_id" ASC);

-- CreateIndex
CREATE INDEX "wallet_transactions_inference_request_id_idx" ON "public"."wallet_transactions"("inference_request_id" ASC);

-- CreateIndex
CREATE INDEX "wallet_transactions_wallet_id_idx" ON "public"."wallet_transactions"("wallet_id" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "public"."wallets"("user_id" ASC);

-- AddForeignKey
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."api_keys" ADD CONSTRAINT "api_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inference_requests" ADD CONSTRAINT "inference_requests_api_key_id_fkey" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inference_requests" ADD CONSTRAINT "inference_requests_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inference_requests" ADD CONSTRAINT "inference_requests_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."inference_requests" ADD CONSTRAINT "inference_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."models" ADD CONSTRAINT "models_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."request_metadata" ADD CONSTRAINT "request_metadata_inference_request_id_fkey" FOREIGN KEY ("inference_request_id") REFERENCES "public"."inference_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userrole" ADD CONSTRAINT "userrole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."userrole" ADD CONSTRAINT "userrole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_inference_request_id_fkey" FOREIGN KEY ("inference_request_id") REFERENCES "public"."inference_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

