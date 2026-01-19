-- Migration: Add Dynamic Billing System
-- Description: Agregar soporte para cálculo dinámico basado en duración del evento
-- Date: 2026-01-26
-- Branch: 260119-studio-dyamic_billing

-- ============================================
-- CREAR ENUM BillingType
-- ============================================
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillingType') THEN
        CREATE TYPE "BillingType" AS ENUM ('HOUR', 'SERVICE', 'UNIT');
    END IF;
END $$;

-- ============================================
-- AGREGAR billing_type A studio_items
-- ============================================
ALTER TABLE public.studio_items
ADD COLUMN IF NOT EXISTS billing_type "BillingType" NOT NULL DEFAULT 'SERVICE';

-- ============================================
-- AGREGAR ÍNDICE COMPUESTO EN studio_items
-- ============================================
CREATE INDEX IF NOT EXISTS idx_studio_items_billing_type 
ON public.studio_items(studio_id, billing_type);

-- ============================================
-- AGREGAR base_hours A studio_paquetes
-- ============================================
ALTER TABLE public.studio_paquetes
ADD COLUMN IF NOT EXISTS base_hours INTEGER;

-- ============================================
-- AGREGAR event_duration A studio_cotizaciones
-- ============================================
ALTER TABLE public.studio_cotizaciones
ADD COLUMN IF NOT EXISTS event_duration INTEGER;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON TYPE "BillingType" IS 
'Tipo de facturación: HOUR (multiplica por duración del evento), SERVICE (precio fijo), UNIT (precio por unidad)';

COMMENT ON COLUMN public.studio_items.billing_type IS 
'Tipo de facturación del ítem: HOUR (multiplica por duración), SERVICE (precio fijo), UNIT (precio por unidad). Por defecto SERVICE para mantener compatibilidad con items existentes.';

COMMENT ON COLUMN public.studio_paquetes.base_hours IS 
'Duración base del paquete en horas. Se usa para calcular items de tipo HOUR al crear cotizaciones. Si es null, se usa promise.duration_hours como fallback.';

COMMENT ON COLUMN public.studio_cotizaciones.event_duration IS 
'Snapshot de la duración del evento al crear la cotización (en horas). Permite recalcular precios históricos sin depender de cambios en promise.duration_hours. Si es null, se usa promise.duration_hours como fallback.';
