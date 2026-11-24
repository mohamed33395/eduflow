-- Payment collection accounts + student transfer proofs.
-- Applied manually (like stored_files.sql) because `prisma migrate dev`
-- wants a full reset due to pre-existing drift.
CREATE TYPE "PaymentMethodKind" AS ENUM ('BANK', 'WALLET', 'CASH');
CREATE TYPE "PaymentProofStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "payment_methods" (
  "id"          TEXT PRIMARY KEY,
  "center_id"   TEXT NOT NULL REFERENCES "centers"("id") ON DELETE CASCADE,
  "kind"        "PaymentMethodKind" NOT NULL,
  "label"       TEXT NOT NULL,
  "account"     TEXT NOT NULL,
  "details"     TEXT,
  "is_active"   BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "payment_methods_center_id_idx" ON "payment_methods"("center_id");

CREATE TABLE "payment_proofs" (
  "id"             TEXT PRIMARY KEY,
  "payment_id"     TEXT NOT NULL REFERENCES "payments"("id") ON DELETE CASCADE,
  "method_id"      TEXT REFERENCES "payment_methods"("id") ON DELETE SET NULL,
  "amount"         DOUBLE PRECISION NOT NULL,
  "reference"      TEXT,
  "screenshot"     TEXT,
  "status"         "PaymentProofStatus" NOT NULL DEFAULT 'PENDING',
  "reviewed_by_id" TEXT REFERENCES "users"("id") ON DELETE SET NULL,
  "reviewed_at"    TIMESTAMP(3),
  "notes"          TEXT,
  "created_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "payment_proofs_payment_id_idx" ON "payment_proofs"("payment_id");
CREATE INDEX "payment_proofs_status_idx" ON "payment_proofs"("status");
