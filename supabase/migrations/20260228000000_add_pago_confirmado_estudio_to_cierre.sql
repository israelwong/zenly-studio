-- Migration: Añadir campo pago_confirmado_estudio a studio_cotizaciones_cierre (Fase 28.0)
-- Permite registrar que el estudio ya confirmó la recepción del anticipo antes de enviar a cierre público

ALTER TABLE studio_cotizaciones_cierre
ADD COLUMN IF NOT EXISTS pago_confirmado_estudio BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN studio_cotizaciones_cierre.pago_confirmado_estudio IS 'Si true, el estudio confirmó que ya recibió el anticipo antes de enviar a cierre';
