-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'PAID', 'WAIVED');

-- AlterTable
ALTER TABLE "centers" ADD COLUMN     "monthly_fee" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "center_billings" (
    "id" TEXT NOT NULL,
    "center_id" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "paid_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "center_billings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "center_billings_center_id_idx" ON "center_billings"("center_id");

-- CreateIndex
CREATE UNIQUE INDEX "center_billings_center_id_year_month_key" ON "center_billings"("center_id", "year", "month");

-- AddForeignKey
ALTER TABLE "center_billings" ADD CONSTRAINT "center_billings_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
