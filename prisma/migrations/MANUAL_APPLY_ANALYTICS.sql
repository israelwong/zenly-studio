-- ============================================
-- MIGRACIÓN MANUAL: Sistema de Analytics
-- Fecha: 2024-12-04
-- Descripción: Crear sistema completo de analytics para contenido
-- ============================================

-- PASO 1: Crear ENUMs si no existen
-- ============================================

DO $$ 
BEGIN
    -- ContentType enum
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContentType') THEN
        CREATE TYPE "ContentType" AS ENUM ('POST', 'PORTFOLIO', 'OFFER', 'PACKAGE');
    END IF;

    -- AnalyticsEventType enum (versión inicial)
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AnalyticsEventType') THEN
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
    END IF;
END $$;

-- PASO 2: Agregar nuevos valores al enum (SIDEBAR_VIEW, OFFER_CLICK)
-- ============================================

-- Nota: ALTER TYPE ADD VALUE no se puede ejecutar en un bloque transaccional
-- Se debe ejecutar por separado

ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'SIDEBAR_VIEW';
ALTER TYPE "AnalyticsEventType" ADD VALUE IF NOT EXISTS 'OFFER_CLICK';

-- PASO 3: Crear tabla de analytics
-- ============================================

CREATE TABLE IF NOT EXISTS "studio_content_analytics" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
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

-- PASO 4: Crear índices para performance
-- ============================================

-- Índice compuesto principal (queries más comunes)
CREATE INDEX IF NOT EXISTS "studio_content_analytics_studio_id_content_type_content_id_event_type_idx" 
ON "studio_content_analytics"("studio_id", "content_type", "content_id", "event_type");

-- Índice para filtrar por contenido y fecha
CREATE INDEX IF NOT EXISTS "studio_content_analytics_content_type_content_id_created_at_idx" 
ON "studio_content_analytics"("content_type", "content_id", "created_at");

-- Índice para analytics del studio por fecha
CREATE INDEX IF NOT EXISTS "studio_content_analytics_studio_id_created_at_idx" 
ON "studio_content_analytics"("studio_id", "created_at");

-- Índice para métricas por tipo de evento
CREATE INDEX IF NOT EXISTS "studio_content_analytics_event_type_created_at_idx" 
ON "studio_content_analytics"("event_type", "created_at");

-- Índice para agrupar por sesión
CREATE INDEX IF NOT EXISTS "studio_content_analytics_session_id_idx" 
ON "studio_content_analytics"("session_id");

-- PASO 5: Agregar foreign key constraint
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'studio_content_analytics_studio_id_fkey'
    ) THEN
        ALTER TABLE "studio_content_analytics" 
        ADD CONSTRAINT "studio_content_analytics_studio_id_fkey" 
        FOREIGN KEY ("studio_id") 
        REFERENCES "studios"("id") 
        ON DELETE CASCADE 
        ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================

-- Verificar que la tabla existe
SELECT 
    tablename, 
    schemaname 
FROM pg_tables 
WHERE tablename = 'studio_content_analytics';

-- Verificar índices creados
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'studio_content_analytics';

-- Verificar enums
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('ContentType', 'AnalyticsEventType')
ORDER BY t.typname, e.enumsortorder;

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
