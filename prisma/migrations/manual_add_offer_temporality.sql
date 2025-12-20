-- Migration: Add temporality fields to studio_offers
-- Created: 2024-12-03
-- Description: Adds is_permanent, has_date_range, start_date, and end_date fields to studio_offers table

-- Add new columns
ALTER TABLE "studio_offers"
ADD COLUMN IF NOT EXISTS "is_permanent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "has_date_range" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "start_date" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "end_date" TIMESTAMP(3);

-- Create index for filtering by temporality
CREATE INDEX IF NOT EXISTS "studio_offers_studio_id_is_permanent_has_date_range_idx" 
ON "studio_offers"("studio_id", "is_permanent", "has_date_range");

-- Add comment
COMMENT ON COLUMN "studio_offers"."is_permanent" IS 'Si true: oferta siempre disponible';
COMMENT ON COLUMN "studio_offers"."has_date_range" IS 'Si true: temporalidad definida';
COMMENT ON COLUMN "studio_offers"."start_date" IS 'Fecha inicio (si has_date_range = true)';
COMMENT ON COLUMN "studio_offers"."end_date" IS 'Fecha fin (si has_date_range = true)';
