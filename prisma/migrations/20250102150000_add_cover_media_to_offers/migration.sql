-- Add cover media fields to studio_offers
ALTER TABLE "studio_offers"
  ADD COLUMN IF NOT EXISTS "cover_media_url" TEXT,
  ADD COLUMN IF NOT EXISTS "cover_media_type" TEXT;
