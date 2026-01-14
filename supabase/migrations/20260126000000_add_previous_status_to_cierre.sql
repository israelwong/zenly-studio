-- Migration: Add previous_status to studio_cotizaciones_cierre
-- Description: Agrega campo para guardar el estado anterior de la cotización antes de pasar a cierre
-- Date: 2026-01-26

-- Agregar campo previous_status
ALTER TABLE public.studio_cotizaciones_cierre
ADD COLUMN IF NOT EXISTS previous_status TEXT;

-- Comentario para documentar el campo
COMMENT ON COLUMN public.studio_cotizaciones_cierre.previous_status IS 
'Estado anterior de la cotización antes de pasar a cierre (pendiente o negociacion). Se usa para restaurar el estado correcto al cancelar el cierre.';
