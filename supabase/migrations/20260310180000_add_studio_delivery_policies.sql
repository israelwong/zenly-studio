-- Migration: add_studio_delivery_policies
-- Description: Agregar campos de Políticas de Entrega a nivel Studio (días de entrega estándar y margen de seguridad)
-- Date: 2026-03-10

ALTER TABLE public.studios
ADD COLUMN IF NOT EXISTS dias_entrega_default INTEGER,
ADD COLUMN IF NOT EXISTS dias_seguridad_default INTEGER;

COMMENT ON COLUMN public.studios.dias_entrega_default IS
'Días que el estudio tarda en entregar el trabajo final tras el evento (Políticas de Entrega)';

COMMENT ON COLUMN public.studios.dias_seguridad_default IS
'Días adicionales de margen de seguridad ante imprevistos (Políticas de Entrega)';
