-- Migration: Add slug field to studio_posts
-- Description: Adds slug field for SEO-friendly URLs

-- Step 1: Add slug column (nullable)
ALTER TABLE "studio_posts" ADD COLUMN "slug" TEXT;

-- Step 2: Generate slugs for existing posts
-- Format: lowercase title + unique suffix from id
UPDATE "studio_posts" 
SET "slug" = LOWER(
  REGEXP_REPLACE(
    REGEXP_REPLACE(
      COALESCE(title, 'post'),
      '[^a-zA-Z0-9\s-]', '', 'g'
    ),
    '\s+', '-', 'g'
  ) || '-' || SUBSTRING(id, 1, 8)
)
WHERE "slug" IS NULL;

-- Step 3: Make slug NOT NULL
ALTER TABLE "studio_posts" ALTER COLUMN "slug" SET NOT NULL;

-- Step 4: Add unique constraint (slug is unique per studio)
CREATE UNIQUE INDEX "studio_posts_studio_id_slug_key" ON "studio_posts"("studio_id", "slug");

-- Step 5: Add index for slug lookups
CREATE INDEX "studio_posts_slug_idx" ON "studio_posts"("slug");
