-- AlterTable: campos de cancelación en studio_cotizaciones (motivo, quién solicita, fecha)
-- Usado al cancelar cierre con pagos (gestión de fondos: retener / marcar devolución)
ALTER TABLE "studio_cotizaciones" ADD COLUMN IF NOT EXISTS "cancel_reason" TEXT;
ALTER TABLE "studio_cotizaciones" ADD COLUMN IF NOT EXISTS "cancel_requested_by" TEXT;
ALTER TABLE "studio_cotizaciones" ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMP(3);

COMMENT ON COLUMN "studio_cotizaciones"."cancel_reason" IS 'Motivo de cancelación (ej. al cancelar cierre con fondos).';
COMMENT ON COLUMN "studio_cotizaciones"."cancel_requested_by" IS 'Quién solicitó la cancelación: estudio | cliente';
COMMENT ON COLUMN "studio_cotizaciones"."cancelled_at" IS 'Fecha/hora de cancelación del cierre.';
