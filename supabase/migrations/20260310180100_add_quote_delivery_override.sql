-- Migration: add_quote_delivery_override
-- Description: Políticas de Entrega en cotizaciones (override por cotización + snapshot al autorizar)
-- Date: 2026-03-10

ALTER TABLE public.studio_cotizaciones
ADD COLUMN IF NOT EXISTS dias_entrega_override INTEGER,
ADD COLUMN IF NOT EXISTS fecha_limite_entrega_snapshot DATE;

COMMENT ON COLUMN public.studio_cotizaciones.dias_entrega_override IS
'Días de entrega acordados para esta cotización; null = usar default del estudio';

COMMENT ON COLUMN public.studio_cotizaciones.fecha_limite_entrega_snapshot IS
'Fecha límite de entrega inmutable al autorizar (event_date + días efectivos)';
