-- AlterTable
ALTER TABLE "studio_cotizaciones_cierre" ADD COLUMN IF NOT EXISTS "firma_requerida" BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN "studio_cotizaciones_cierre"."firma_requerida" IS 'Si true, se exige firma del cliente antes de autorizar; si false, se puede autorizar sin firma (pendiente de firma).';
