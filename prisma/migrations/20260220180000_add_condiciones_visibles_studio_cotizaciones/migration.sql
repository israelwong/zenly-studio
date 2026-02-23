-- AlterTable: add condiciones_visibles (JSONB array of condition IDs) to studio_cotizaciones.
-- Fase 6.3: condiciones que el prospecto podrá elegir al aceptar la cotización.
ALTER TABLE "studio_cotizaciones" ADD COLUMN IF NOT EXISTS "condiciones_visibles" JSONB;
