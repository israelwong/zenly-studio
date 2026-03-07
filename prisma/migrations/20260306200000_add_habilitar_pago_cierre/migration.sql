-- AlterTable
ALTER TABLE "studio_cotizaciones_cierre" ADD COLUMN IF NOT EXISTS "habilitar_pago" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "studio_cotizaciones_cierre"."habilitar_pago" IS 'Si true, el estudio requiere anticipo del cliente (mostrar paso de pago en vista pública); si false, no mostrar pago.';
