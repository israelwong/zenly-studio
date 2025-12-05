-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('POST', 'PORTFOLIO', 'OFFER', 'PACKAGE');

-- CreateEnum
CREATE TYPE "AnalyticsEventType" AS ENUM (
  'PAGE_VIEW',
  'FEED_VIEW',
  'MODAL_OPEN',
  'MODAL_CLOSE',
  'NEXT_CONTENT',
  'PREV_CONTENT',
  'LINK_COPY',
  'SHARE_CLICK',
  'MEDIA_CLICK',
  'MEDIA_VIEW',
  'CAROUSEL_NEXT',
  'CAROUSEL_PREV',
  'CTA_CLICK',
  'WHATSAPP_CLICK',
  'FORM_VIEW',
  'FORM_SUBMIT',
  'SCROLL_50',
  'SCROLL_100',
  'TIME_30S',
  'TIME_60S'
);

-- CreateTable
CREATE TABLE "studio_content_analytics" (
    "id" TEXT NOT NULL,
    "studio_id" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL,
    "content_id" TEXT NOT NULL,
    "event_type" "AnalyticsEventType" NOT NULL,
    "user_id" TEXT,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "session_id" TEXT,
    "referrer" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "utm_term" TEXT,
    "utm_content" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "studio_content_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "studio_content_analytics_studio_id_content_type_content_id_event_type_idx" ON "studio_content_analytics"("studio_id", "content_type", "content_id", "event_type");

-- CreateIndex
CREATE INDEX "studio_content_analytics_content_type_content_id_created_at_idx" ON "studio_content_analytics"("content_type", "content_id", "created_at");

-- CreateIndex
CREATE INDEX "studio_content_analytics_studio_id_created_at_idx" ON "studio_content_analytics"("studio_id", "created_at");

-- CreateIndex
CREATE INDEX "studio_content_analytics_event_type_created_at_idx" ON "studio_content_analytics"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "studio_content_analytics_session_id_idx" ON "studio_content_analytics"("session_id");

-- AddForeignKey
ALTER TABLE "studio_content_analytics" ADD CONSTRAINT "studio_content_analytics_studio_id_fkey" FOREIGN KEY ("studio_id") REFERENCES "studios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
