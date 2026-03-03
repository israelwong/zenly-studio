-- Migration: add financial snapshot fields to studio_cotizaciones
-- Purpose: Auditoría de persistencia — valores inmutables al autorizar para reportes y anexos (ej. Cotización B al mismo evento).
-- monto_cortesias ya existe como cortesias_monto_snapshot.

ALTER TABLE public.studio_cotizaciones
  ADD COLUMN IF NOT EXISTS snap_precio_lista DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS snap_ajuste_cierre DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS snap_monto_bono DECIMAL(12, 2),
  ADD COLUMN IF NOT EXISTS snap_total_final DECIMAL(12, 2);

COMMENT ON COLUMN public.studio_cotizaciones.snap_precio_lista IS
  'Snapshot al autorizar: precio de lista (precio_calculado o price). Inmutable.';
COMMENT ON COLUMN public.studio_cotizaciones.snap_ajuste_cierre IS
  'Snapshot al autorizar: ajuste por cierre (total_final - (precio_lista - cortesías - bono)). Inmutable.';
COMMENT ON COLUMN public.studio_cotizaciones.snap_monto_bono IS
  'Snapshot al autorizar: monto bono especial. Inmutable.';
COMMENT ON COLUMN public.studio_cotizaciones.snap_total_final IS
  'Snapshot al autorizar: total a pagar. Para anexos: sumar snap_total_final de todas las cotizaciones del evento.';
