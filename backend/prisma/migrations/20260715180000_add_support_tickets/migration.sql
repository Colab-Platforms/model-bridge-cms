-- CreateEnum
CREATE TYPE "public"."SupportTicketCategory" AS ENUM ('BILLING', 'TECHNICAL', 'ACCOUNT', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."SupportTicketStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED');

-- CreateTable
CREATE TABLE "public"."support_tickets" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "reference_number" TEXT NOT NULL,
    "category" "public"."SupportTicketCategory" NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "public"."SupportTicketStatus" NOT NULL DEFAULT 'OPEN',
    "attachment_url" TEXT,
    "attachment_name" TEXT,
    "attachment_size_bytes" INTEGER,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "support_tickets_reference_number_key" ON "public"."support_tickets"("reference_number");

-- CreateIndex
CREATE INDEX "support_tickets_user_id_created_at_idx" ON "public"."support_tickets"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_status_created_at_idx" ON "public"."support_tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "support_tickets_category_created_at_idx" ON "public"."support_tickets"("category", "created_at");

-- AddForeignKey
ALTER TABLE "public"."support_tickets"
ADD CONSTRAINT "support_tickets_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
