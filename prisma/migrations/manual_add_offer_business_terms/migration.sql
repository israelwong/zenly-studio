-- Manual migration: Add offer business terms support
-- Permite que ofertas tengan condiciones comerciales especiales

-- Add new columns to studio_condiciones_comerciales
ALTER TABLE "studio_condiciones_comerciales" 
ADD COLUMN IF NOT EXISTS "type" TEXT DEFAULT 'standard',
ADD COLUMN IF NOT EXISTS "offer_id" TEXT,
ADD COLUMN IF NOT EXISTS "override_standard" BOOLEAN DEFAULT false;

-- Drop existing constraint if exists (for idempotency)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'studio_condiciones_comerciales_offer_id_key'
    ) THEN
        ALTER TABLE "studio_condiciones_comerciales" DROP CONSTRAINT "studio_condiciones_comerciales_offer_id_key";
    END IF;
END $$;

-- Add unique constraint for offer_id
ALTER TABLE "studio_condiciones_comerciales"
ADD CONSTRAINT "studio_condiciones_comerciales_offer_id_key" 
UNIQUE ("offer_id");

-- Add indexes
CREATE INDEX IF NOT EXISTS "studio_condiciones_comerciales_studio_id_type_idx" 
ON "studio_condiciones_comerciales"("studio_id", "type");

CREATE INDEX IF NOT EXISTS "studio_condiciones_comerciales_offer_id_idx" 
ON "studio_condiciones_comerciales"("offer_id");

-- Drop existing foreign key if exists (for idempotency)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'studio_condiciones_comerciales_offer_id_fkey'
    ) THEN
        ALTER TABLE "studio_condiciones_comerciales" DROP CONSTRAINT "studio_condiciones_comerciales_offer_id_fkey";
    END IF;
END $$;

-- Add foreign key constraint
ALTER TABLE "studio_condiciones_comerciales"
ADD CONSTRAINT "studio_condiciones_comerciales_offer_id_fkey"
FOREIGN KEY ("offer_id") 
REFERENCES "studio_offers"("id") 
ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN "studio_condiciones_comerciales"."type" IS 'Tipo: standard (siempre visible) | offer (temporal/promocional)';
COMMENT ON COLUMN "studio_condiciones_comerciales"."offer_id" IS 'ID de oferta asociada si type=offer';
COMMENT ON COLUMN "studio_condiciones_comerciales"."override_standard" IS 'Si true, oculta condiciones estándar en vista pública';
