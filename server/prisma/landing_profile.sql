-- Landing profile (public page content) for centers and courses.
-- Applied manually like stored_files.sql because prisma migrate dev wants a
-- full DB reset due to pre-existing drift.
ALTER TABLE "centers" ADD COLUMN IF NOT EXISTS "landing_profile" JSONB;
ALTER TABLE "courses" ADD COLUMN IF NOT EXISTS "landing_profile" JSONB;
