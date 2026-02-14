-- Add order column to studio_section_categories for per-section category ordering
ALTER TABLE "public"."studio_section_categories" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: copy order from studio_service_categories for existing rows
UPDATE "public"."studio_section_categories" sc
SET "order" = c."order"
FROM "public"."studio_service_categories" c
WHERE sc.category_id = c.id;

-- Index for efficient ordering queries
CREATE INDEX IF NOT EXISTS "studio_section_categories_section_order_idx" ON "public"."studio_section_categories"("section_id", "order");
