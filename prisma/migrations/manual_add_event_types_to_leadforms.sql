-- Migration: Add event types support to leadforms
-- Date: 2024-12-03
-- Author: AI Assistant
-- Description: Agrega soporte para tipos de evento en leadforms, incluyendo campos para selección de tipos y mostrar paquetes

-- ============================================================================
-- 1. Agregar campos a studio_offer_leadforms
-- ============================================================================

-- Agregar campo para indicar si usar tipos de evento
ALTER TABLE "public"."studio_offer_leadforms"
ADD COLUMN IF NOT EXISTS "use_event_types" BOOLEAN NOT NULL DEFAULT false;

-- Agregar campo para IDs de tipos de evento seleccionados (JSON array)
ALTER TABLE "public"."studio_offer_leadforms"
ADD COLUMN IF NOT EXISTS "selected_event_type_ids" JSONB;

-- Agregar campo para mostrar paquetes después del registro
ALTER TABLE "public"."studio_offer_leadforms"
ADD COLUMN IF NOT EXISTS "show_packages_after_submit" BOOLEAN NOT NULL DEFAULT false;

-- Comentarios para documentación
COMMENT ON COLUMN "public"."studio_offer_leadforms"."use_event_types" IS 'Si true: usar studio_event_types, si false: usar subject_options';
COMMENT ON COLUMN "public"."studio_offer_leadforms"."selected_event_type_ids" IS 'Array de IDs de studio_event_types seleccionados';
COMMENT ON COLUMN "public"."studio_offer_leadforms"."show_packages_after_submit" IS 'Mostrar paquetes después de registro';
COMMENT ON COLUMN "public"."studio_offer_leadforms"."subject_options" IS 'LEGACY: opciones personalizadas (usar si use_event_types = false)';

-- ============================================================================
-- 2. Agregar campos a platform_leads
-- ============================================================================

-- Agregar campo para tipo de evento (si viene de leadform con use_event_types = true)
ALTER TABLE "public"."platform_leads"
ADD COLUMN IF NOT EXISTS "event_type_id" TEXT;

-- Agregar campo legacy para asunto personalizado
ALTER TABLE "public"."platform_leads"
ADD COLUMN IF NOT EXISTS "subject" TEXT;

-- Agregar relación FK con studio_event_types (opcional, permite nulls)
ALTER TABLE "public"."platform_leads"
ADD CONSTRAINT IF NOT EXISTS "platform_leads_event_type_id_fkey"
FOREIGN KEY ("event_type_id")
REFERENCES "public"."studio_event_types"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Comentarios para documentación
COMMENT ON COLUMN "public"."platform_leads"."event_type_id" IS 'Tipo de evento seleccionado en leadform (si use_event_types = true)';
COMMENT ON COLUMN "public"."platform_leads"."subject" IS 'LEGACY: asunto personalizado (si use_event_types = false)';

-- ============================================================================
-- 3. Verificación de datos existentes
-- ============================================================================

-- Verificar que no hay conflictos con datos existentes
DO $$
DECLARE
  leadform_count INTEGER;
  lead_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO leadform_count FROM "public"."studio_offer_leadforms";
  SELECT COUNT(*) INTO lead_count FROM "public"."platform_leads";
  
  RAISE NOTICE 'Migración completada:';
  RAISE NOTICE '- Leadforms afectados: %', leadform_count;
  RAISE NOTICE '- Leads existentes: %', lead_count;
  RAISE NOTICE '- Todos los leadforms existentes mantendrán use_event_types = false (modo legacy)';
END $$;
