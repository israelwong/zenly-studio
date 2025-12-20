-- AlterTable
ALTER TABLE "studios" ADD COLUMN IF NOT EXISTS "gtm_id" TEXT,
ADD COLUMN IF NOT EXISTS "facebook_pixel_id" TEXT,
ADD COLUMN IF NOT EXISTS "zen_pixel_id" TEXT;

-- CreateTable
CREATE TABLE IF NOT EXISTS "studio_offers" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "objective" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "studio_offer_landing_pages" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "content_blocks" JSONB NOT NULL,
    "cta_config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_offer_landing_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "studio_offer_leadforms" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "success_message" TEXT NOT NULL DEFAULT '¡Gracias! Nos pondremos en contacto pronto.',
    "success_redirect_url" TEXT,
    "fields_config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_offer_leadforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "studio_offer_visits" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "visit_type" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_offer_visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "studio_offer_submissions" (
    "id" TEXT NOT NULL,
    "offer_id" TEXT NOT NULL,
    "contact_id" TEXT,
    "visit_id" TEXT,
    "form_data" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "conversion_value" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_offer_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "studio_offers_studio_id_slug_key" ON "studio_offers"("studio_id", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offers_studio_id_is_active_idx" ON "studio_offers"("studio_id", "is_active");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offers_studio_id_slug_idx" ON "studio_offers"("studio_id", "slug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_landing_pages_offer_id_idx" ON "studio_offer_landing_pages"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "studio_offer_landing_pages_offer_id_key" ON "studio_offer_landing_pages"("offer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_leadforms_offer_id_idx" ON "studio_offer_leadforms"("offer_id");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "studio_offer_leadforms_offer_id_key" ON "studio_offer_leadforms"("offer_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_visits_offer_id_visit_type_created_at_idx" ON "studio_offer_visits"("offer_id", "visit_type", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_visits_session_id_idx" ON "studio_offer_visits"("session_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_visits_created_at_idx" ON "studio_offer_visits"("created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_submissions_offer_id_created_at_idx" ON "studio_offer_submissions"("offer_id", "created_at");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_submissions_contact_id_idx" ON "studio_offer_submissions"("contact_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "studio_offer_submissions_visit_id_idx" ON "studio_offer_submissions"("visit_id");

-- AddForeignKey
ALTER TABLE "studio_offers" ADD CONSTRAINT "studio_offers_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_offer_landing_pages" ADD CONSTRAINT "studio_offer_landing_pages_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "studio_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_offer_leadforms" ADD CONSTRAINT "studio_offer_leadforms_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "studio_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_offer_visits" ADD CONSTRAINT "studio_offer_visits_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "studio_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_offer_submissions" ADD CONSTRAINT "studio_offer_submissions_offer_id_fkey" FOREIGN KEY ("offer_id") REFERENCES "studio_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_offer_submissions" ADD CONSTRAINT "studio_offer_submissions_contact_id_fkey" FOREIGN KEY ("contact_id") REFERENCES "studio_contacts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "studio_offer_submissions" ADD CONSTRAINT "studio_offer_submissions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "studio_offer_visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;
