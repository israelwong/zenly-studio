-- Migration: Add duration_hours field to studio_promises
-- Description: Agregar campo opcional de duración del evento en horas para cálculo de cotizaciones y paquetes dinámicos
-- Date: 2026-01-11

-- ============================================
-- AGREGAR CAMPO DURACIÓN DEL EVENTO
-- ============================================
ALTER TABLE public.studio_promises
ADD COLUMN IF NOT EXISTS duration_hours INTEGER;

-- ============================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- ============================================
COMMENT ON COLUMN public.studio_promises.duration_hours IS
'Duración del evento en horas. Campo opcional que se utilizará para calcular cotizaciones y precios de paquetes dinámicos por hora';
