-- Booking/join requests submitted from public landing pages.
-- Applied manually like stored_files.sql because prisma migrate dev wants a
-- full DB reset due to pre-existing drift.
CREATE TABLE IF NOT EXISTS "landing_requests" (
  "id" TEXT NOT NULL,
  "center_id" TEXT,
  "course_id" TEXT,
  "role" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "email" TEXT,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "landing_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "landing_requests_center_id_fkey" FOREIGN KEY ("center_id") REFERENCES "centers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "landing_requests_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "landing_requests_center_id_idx" ON "landing_requests"("center_id");
CREATE INDEX IF NOT EXISTS "landing_requests_course_id_idx" ON "landing_requests"("course_id");
CREATE INDEX IF NOT EXISTS "landing_requests_status_idx" ON "landing_requests"("status");
