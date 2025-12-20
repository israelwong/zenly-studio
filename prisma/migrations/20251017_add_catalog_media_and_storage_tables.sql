-- New table: studio_section_media
CREATE TABLE IF NOT EXISTS public."studio_section_media" (
    "id" TEXT NOT NULL,
    "section_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "file_url" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "storage_bytes" BIGINT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "dimensions" JSONB,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "alt_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_section_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_section_media_section_id_fkey"
        FOREIGN KEY ("section_id")
        REFERENCES "public"."studio_service_sections"("id")
        ON DELETE CASCADE,
    CONSTRAINT "studio_section_media_studio_id_fkey"
        FOREIGN KEY ("studio_id")
        REFERENCES "public"."studios"("id")
        ON DELETE CASCADE
);

CREATE INDEX "studio_section_media_section_id_idx"
    ON "public"."studio_section_media"("section_id");
CREATE INDEX "studio_section_media_studio_id_idx"
    ON "public"."studio_section_media"("studio_id");
CREATE INDEX "studio_section_media_storage_bytes_idx"
    ON "public"."studio_section_media"("storage_bytes");


-- New table: studio_category_media
CREATE TABLE IF NOT EXISTS public."studio_category_media" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_category_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_category_media_category_id_fkey"
        FOREIGN KEY ("category_id")
        REFERENCES "public"."studio_service_categories"("id")
        ON DELETE CASCADE,
    CONSTRAINT "studio_category_media_studio_id_fkey"
        FOREIGN KEY ("studio_id")
        REFERENCES "public"."studios"("id")
        ON DELETE CASCADE
);

CREATE INDEX "studio_category_media_category_id_idx"
    ON "public"."studio_category_media"("category_id");
CREATE INDEX "studio_category_media_studio_id_idx"
    ON "public"."studio_category_media"("studio_id");
CREATE INDEX "studio_category_media_storage_bytes_idx"
    ON "public"."studio_category_media"("storage_bytes");


-- New table: studio_item_media
CREATE TABLE IF NOT EXISTS public."studio_item_media" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_item_media_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_item_media_item_id_fkey"
        FOREIGN KEY ("item_id")
        REFERENCES "public"."studio_items"("id")
        ON DELETE CASCADE,
    CONSTRAINT "studio_item_media_studio_id_fkey"
        FOREIGN KEY ("studio_id")
        REFERENCES "public"."studios"("id")
        ON DELETE CASCADE
);

CREATE INDEX "studio_item_media_item_id_idx"
    ON "public"."studio_item_media"("item_id");
CREATE INDEX "studio_item_media_studio_id_idx"
    ON "public"."studio_item_media"("studio_id");
CREATE INDEX "studio_item_media_storage_bytes_idx"
    ON "public"."studio_item_media"("storage_bytes");


-- New table: studio_storage_usage
CREATE TABLE IF NOT EXISTS public."studio_storage_usage" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "total_storage_bytes" BIGINT NOT NULL DEFAULT 0,
    "section_media_bytes" BIGINT NOT NULL DEFAULT 0,
    "category_media_bytes" BIGINT NOT NULL DEFAULT 0,
    "item_media_bytes" BIGINT NOT NULL DEFAULT 0,
    "portfolio_media_bytes" BIGINT NOT NULL DEFAULT 0,
    "page_media_bytes" BIGINT NOT NULL DEFAULT 0,
    "quota_limit_bytes" BIGINT NOT NULL,
    "last_calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_storage_usage_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_storage_usage_studio_id_unique" UNIQUE ("studio_id"),
    CONSTRAINT "studio_storage_usage_studio_id_fkey"
        FOREIGN KEY ("studio_id")
        REFERENCES "public"."studios"("id")
        ON DELETE CASCADE
);

CREATE INDEX "studio_storage_usage_studio_id_idx"
    ON "public"."studio_storage_usage"("studio_id");
CREATE INDEX "studio_storage_usage_total_storage_bytes_idx"
    ON "public"."studio_storage_usage"("total_storage_bytes");


-- New table: studio_storage_log
CREATE TABLE IF NOT EXISTS public."studio_storage_log" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "media_type" TEXT NOT NULL,
    "storage_bytes" BIGINT NOT NULL,
    "filename" TEXT NOT NULL,
    "reason" TEXT,
    "triggered_by_user" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_storage_log_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "studio_storage_log_studio_id_fkey"
        FOREIGN KEY ("studio_id")
        REFERENCES "public"."studios"("id")
        ON DELETE CASCADE
);

CREATE INDEX "studio_storage_log_studio_id_action_idx"
    ON "public"."studio_storage_log"("studio_id", "action");
CREATE INDEX "studio_storage_log_studio_id_created_at_idx"
    ON "public"."studio_storage_log"("studio_id", "created_at");


-- Modify existing tables
ALTER TABLE "public"."studio_service_sections"
ADD COLUMN IF NOT EXISTS "settings" JSONB,
ADD COLUMN IF NOT EXISTS "visibility_mode" TEXT DEFAULT 'public';

ALTER TABLE "public"."studio_service_categories"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "settings" JSONB,
ADD COLUMN IF NOT EXISTS "visibility_mode" TEXT DEFAULT 'public';

ALTER TABLE "public"."studio_items"
ADD COLUMN IF NOT EXISTS "description" TEXT,
ADD COLUMN IF NOT EXISTS "specifications" JSONB,
ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "is_new" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "new_badge_expires_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "visibility_settings" JSONB;

ALTER TABLE "public"."studio_pages"
ADD COLUMN IF NOT EXISTS "catalog_display_mode" TEXT DEFAULT 'HIERARCHICAL';

-- Additional indices
CREATE INDEX IF NOT EXISTS "studio_items_is_featured_idx"
    ON "public"."studio_items"("is_featured");
CREATE INDEX IF NOT EXISTS "studio_items_is_new_idx"
    ON "public"."studio_items"("is_new");
