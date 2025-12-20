-- Migration: Add offer_id to studio_promises
-- Date: 2025-01-12
-- Description: Associate promises with the offer that generated them

-- 1. Add offer_id column (nullable - manual promises don't have offer)
ALTER TABLE "studio_promises" 
ADD COLUMN "offer_id" TEXT;

-- 2. Create index for offer_id
CREATE INDEX "studio_promises_offer_id_idx" ON "studio_promises"("offer_id");

-- 3. Create compound index for studio_id + offer_id (analytics)
CREATE INDEX "studio_promises_studio_id_offer_id_idx" ON "studio_promises"("studio_id", "offer_id");

-- 4. Add foreign key constraint with SET NULL on delete
ALTER TABLE "studio_promises" 
ADD CONSTRAINT "studio_promises_offer_id_fkey" 
FOREIGN KEY ("offer_id") 
REFERENCES "studio_offers"("id") 
ON DELETE SET NULL 
ON UPDATE CASCADE;

-- 5. (Optional) Backfill existing data from submissions
-- This associates existing promises with their originating offer
UPDATE "studio_promises" p
SET "offer_id" = (
  SELECT s."offer_id" 
  FROM "studio_offer_submissions" s 
  WHERE s."contact_id" = p."contact_id" 
  AND s."created_at" <= p."created_at"
  ORDER BY s."created_at" DESC 
  LIMIT 1
)
WHERE p."offer_id" IS NULL 
AND EXISTS (
  SELECT 1 
  FROM "studio_offer_submissions" s 
  WHERE s."contact_id" = p."contact_id"
);

-- Verify migration
SELECT 
  'Total promises' as metric,
  COUNT(*) as count
FROM "studio_promises"
UNION ALL
SELECT 
  'Promises with offer' as metric,
  COUNT(*) as count
FROM "studio_promises"
WHERE "offer_id" IS NOT NULL
UNION ALL
SELECT 
  'Manual promises (no offer)' as metric,
  COUNT(*) as count
FROM "studio_promises"
WHERE "offer_id" IS NULL;

