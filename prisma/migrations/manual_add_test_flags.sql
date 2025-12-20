-- Migration: Add test flags for preview testing
-- Date: 2024-12-03
-- Author: AI Assistant
-- Description: Agrega campos is_test y test_created_at para identificar datos de prueba del preview

-- ============================================================================
-- 1. Agregar campos a studio_promises
-- ============================================================================

ALTER TABLE "public"."studio_promises"
ADD COLUMN IF NOT EXISTS "is_test" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "test_created_at" TIMESTAMP;

COMMENT ON COLUMN "public"."studio_promises"."is_test" IS 'Marca promesas de prueba creadas desde preview del editor de ofertas';
COMMENT ON COLUMN "public"."studio_promises"."test_created_at" IS 'Timestamp de creación para tracking y posible auto-cleanup';

-- Índice para queries eficientes
CREATE INDEX IF NOT EXISTS "idx_promises_studio_test" 
  ON "public"."studio_promises"("studio_id", "is_test");

-- ============================================================================
-- 2. Agregar campos a studio_contacts
-- ============================================================================

ALTER TABLE "public"."studio_contacts"
ADD COLUMN IF NOT EXISTS "is_test" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "test_created_at" TIMESTAMP;

COMMENT ON COLUMN "public"."studio_contacts"."is_test" IS 'Marca contactos de prueba (solo eliminar si no tiene promesas reales)';
COMMENT ON COLUMN "public"."studio_contacts"."test_created_at" IS 'Timestamp de creación para tracking';

-- Índice para queries eficientes
CREATE INDEX IF NOT EXISTS "idx_contacts_studio_test" 
  ON "public"."studio_contacts"("studio_id", "is_test");

-- ============================================================================
-- 3. Agregar campos a platform_leads
-- ============================================================================

ALTER TABLE "public"."platform_leads"
ADD COLUMN IF NOT EXISTS "is_test" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "test_created_at" TIMESTAMP;

COMMENT ON COLUMN "public"."platform_leads"."is_test" IS 'Marca leads de prueba del sistema comercial';
COMMENT ON COLUMN "public"."platform_leads"."test_created_at" IS 'Timestamp de creación para tracking';

-- Índice para queries eficientes (si studio_id existe y es indexable)
-- Nota: platform_leads.studio_id es UNIQUE, verificar si necesita índice compuesto
CREATE INDEX IF NOT EXISTS "idx_leads_test" 
  ON "public"."platform_leads"("is_test")
  WHERE "is_test" = true;

-- ============================================================================
-- 4. Verificación de datos existentes
-- ============================================================================

DO $$
DECLARE
  promises_count INTEGER;
  contacts_count INTEGER;
  leads_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO promises_count FROM "public"."studio_promises";
  SELECT COUNT(*) INTO contacts_count FROM "public"."studio_contacts";
  SELECT COUNT(*) INTO leads_count FROM "public"."platform_leads";
  
  RAISE NOTICE 'Migración completada exitosamente:';
  RAISE NOTICE '- Promesas existentes: %', promises_count;
  RAISE NOTICE '- Contactos existentes: %', contacts_count;
  RAISE NOTICE '- Leads existentes: %', leads_count;
  RAISE NOTICE '- Todos los registros existentes tienen is_test = false por defecto';
  RAISE NOTICE '- Nuevas promesas de prueba se marcarán automáticamente';
END $$;
