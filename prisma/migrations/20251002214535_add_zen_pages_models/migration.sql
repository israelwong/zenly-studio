-- CreateEnum
CREATE TYPE "public"."PageSectionType" AS ENUM ('HERO', 'ABOUT', 'SERVICES', 'CTA', 'TESTIMONIALS', 'FAQ', 'CUSTOM');

-- CreateEnum
CREATE TYPE "public"."PortfolioItemType" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "public"."studio_pages" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "custom_domain" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_keywords" TEXT,
    "favicon_url" TEXT,
    "og_image_url" TEXT,
    "analytics_code" TEXT,
    "theme_color" TEXT DEFAULT '#8B5CF6',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_page_sections" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "section_type" "public"."PageSectionType" NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "content" TEXT,
    "image_url" TEXT,
    "video_url" TEXT,
    "cta_text" TEXT,
    "cta_link" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_visible" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_page_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_portfolios" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "cover_image_url" TEXT,
    "category" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "view_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_portfolios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_portfolio_items" (
    "id" TEXT NOT NULL,
    "portfolio_id" TEXT NOT NULL,
    "item_type" "public"."PortfolioItemType" NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "video_url" TEXT,
    "video_provider" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "file_size" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_portfolio_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_lead_forms" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "form_name" TEXT NOT NULL,
    "form_slug" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "success_message" TEXT NOT NULL DEFAULT '¡Gracias! Nos pondremos en contacto pronto.',
    "redirect_to_packages" BOOLEAN NOT NULL DEFAULT true,
    "fields_config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "submit_count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "studio_lead_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."studio_client_portal_access" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "client_email" TEXT NOT NULL,
    "client_name" TEXT,
    "access_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_accessed_at" TIMESTAMP(3),
    "access_count" INTEGER NOT NULL DEFAULT 0,
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_client_portal_access_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "studio_pages_studio_id_key" ON "public"."studio_pages"("studio_id");

-- CreateIndex
CREATE UNIQUE INDEX "studio_pages_custom_domain_key" ON "public"."studio_pages"("custom_domain");

-- CreateIndex
CREATE INDEX "studio_pages_studio_id_is_published_idx" ON "public"."studio_pages"("studio_id", "is_published");

-- CreateIndex
CREATE INDEX "studio_page_sections_page_id_order_idx" ON "public"."studio_page_sections"("page_id", "order");

-- CreateIndex
CREATE INDEX "studio_portfolios_studio_id_is_published_idx" ON "public"."studio_portfolios"("studio_id", "is_published");

-- CreateIndex
CREATE INDEX "studio_portfolios_order_idx" ON "public"."studio_portfolios"("order");

-- CreateIndex
CREATE UNIQUE INDEX "studio_portfolios_page_id_slug_key" ON "public"."studio_portfolios"("page_id", "slug");

-- CreateIndex
CREATE INDEX "studio_portfolio_items_portfolio_id_order_idx" ON "public"."studio_portfolio_items"("portfolio_id", "order");

-- CreateIndex
CREATE INDEX "studio_lead_forms_studio_id_is_active_idx" ON "public"."studio_lead_forms"("studio_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "studio_lead_forms_studio_id_form_slug_key" ON "public"."studio_lead_forms"("studio_id", "form_slug");

-- CreateIndex
CREATE UNIQUE INDEX "studio_client_portal_access_access_code_key" ON "public"."studio_client_portal_access"("access_code");

-- CreateIndex
CREATE INDEX "studio_client_portal_access_access_code_idx" ON "public"."studio_client_portal_access"("access_code");

-- CreateIndex
CREATE INDEX "studio_client_portal_access_client_email_idx" ON "public"."studio_client_portal_access"("client_email");

-- CreateIndex
CREATE INDEX "studio_client_portal_access_studio_id_is_active_idx" ON "public"."studio_client_portal_access"("studio_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "studio_client_portal_access_studio_id_event_id_client_email_key" ON "public"."studio_client_portal_access"("studio_id", "event_id", "client_email");

-- AddForeignKey
ALTER TABLE "public"."studio_pages" ADD CONSTRAINT "studio_pages_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_page_sections" ADD CONSTRAINT "studio_page_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."studio_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_portfolios" ADD CONSTRAINT "studio_portfolios_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "public"."studio_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_portfolios" ADD CONSTRAINT "studio_portfolios_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_portfolio_items" ADD CONSTRAINT "studio_portfolio_items_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "public"."studio_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_lead_forms" ADD CONSTRAINT "studio_lead_forms_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_client_portal_access" ADD CONSTRAINT "studio_client_portal_access_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "public"."studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."studio_client_portal_access" ADD CONSTRAINT "studio_client_portal_access_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "public"."manager_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
