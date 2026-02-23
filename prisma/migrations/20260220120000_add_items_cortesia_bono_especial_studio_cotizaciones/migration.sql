-- AlterTable: add items_cortesia (jsonb) and bono_especial (decimal) to studio_cotizaciones for persistence of negotiation adjustments (cortesías + bono).
ALTER TABLE "studio_cotizaciones" ADD COLUMN IF NOT EXISTS "items_cortesia" JSONB;
ALTER TABLE "studio_cotizaciones" ADD COLUMN IF NOT EXISTS "bono_especial" DECIMAL(10,2);
