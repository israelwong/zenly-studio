-- Manual migration: Add event_type_id to studio_offer_leadforms
-- Para ofertas: UN tipo de evento asociado (single)
-- Mantiene selected_event_type_ids para leadforms genéricos futuros (multiple)

-- Add event_type_id column
ALTER TABLE "studio_offer_leadforms" 
ADD COLUMN IF NOT EXISTS "event_type_id" TEXT;

-- Add index for event_type_id
CREATE INDEX IF NOT EXISTS "studio_offer_leadforms_event_type_id_idx" 
ON "studio_offer_leadforms"("event_type_id");

-- Comment on columns
COMMENT ON COLUMN "studio_offer_leadforms"."event_type_id" IS 'Para OFERTAS: UN tipo de evento asociado (single)';
COMMENT ON COLUMN "studio_offer_leadforms"."selected_event_type_ids" IS 'Para LEADFORMS GENÉRICOS: múltiples tipos disponibles (array)';
