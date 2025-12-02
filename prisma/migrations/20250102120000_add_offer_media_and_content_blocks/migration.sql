-- AlterTable: Remove content_blocks column from studio_offer_landing_pages
ALTER TABLE "studio_offer_landing_pages" DROP COLUMN IF EXISTS "content_blocks";

-- CreateTable: studio_offer_media
CREATE TABLE IF NOT EXISTS "studio_offer_media" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "dimensions" JSONB,
    "duration_seconds" INTEGER,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "alt_text" TEXT,
    "thumbnail_url" TEXT,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_offer_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable: studio_offer_content_blocks
CREATE TABLE IF NOT EXISTS "studio_offer_content_blocks" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "presentation" TEXT NOT NULL DEFAULT 'block',
    "order" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_offer_content_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable: studio_offer_content_block_media
CREATE TABLE IF NOT EXISTS "studio_offer_content_block_media" (
    "id" TEXT NOT NULL,
    "content_block_id" TEXT NOT NULL,
    "media_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_offer_content_block_media_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "studio_offer_media" ADD CONSTRAINT "studio_offer_media_offer_id_fkey" 
    FOREIGN KEY ("offer_id") REFERENCES "studio_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_offer_media" ADD CONSTRAINT "studio_offer_media_studio_id_fkey" 
    FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_offer_content_blocks" ADD CONSTRAINT "studio_offer_content_blocks_offer_id_fkey" 
    FOREIGN KEY ("offer_id") REFERENCES "studio_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_offer_content_block_media" ADD CONSTRAINT "studio_offer_content_block_media_content_block_id_fkey" 
    FOREIGN KEY ("content_block_id") REFERENCES "studio_offer_content_blocks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "studio_offer_content_block_media" ADD CONSTRAINT "studio_offer_content_block_media_media_id_fkey" 
    FOREIGN KEY ("media_id") REFERENCES "studio_offer_media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_media_offer_id_idx" ON "studio_offer_media"("offer_id");
CREATE INDEX IF NOT EXISTS "studio_offer_media_studio_id_idx" ON "studio_offer_media"("studio_id");
CREATE INDEX IF NOT EXISTS "studio_offer_media_display_order_idx" ON "studio_offer_media"("display_order");
CREATE INDEX IF NOT EXISTS "studio_offer_media_storage_bytes_idx" ON "studio_offer_media"("storage_bytes");

CREATE INDEX IF NOT EXISTS "studio_offer_content_blocks_offer_id_order_idx" ON "studio_offer_content_blocks"("offer_id", "order");
CREATE INDEX IF NOT EXISTS "studio_offer_content_blocks_type_idx" ON "studio_offer_content_blocks"("type");

CREATE UNIQUE INDEX IF NOT EXISTS "studio_offer_content_block_media_content_block_id_media_id_key" 
    ON "studio_offer_content_block_media"("content_block_id", "media_id");
CREATE INDEX IF NOT EXISTS "studio_offer_content_block_media_content_block_id_order_idx" 
    ON "studio_offer_content_block_media"("content_block_id", "order");
CREATE INDEX IF NOT EXISTS "studio_offer_content_block_media_media_id_idx" 
    ON "studio_offer_content_block_media"("media_id");
