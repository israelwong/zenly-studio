-- Manual migration: Add advance_type and advance_amount to support fixed amount advances
-- Permite que el anticipo pueda ser un porcentaje o un monto fijo

-- Add new columns to studio_condiciones_comerciales
ALTER TABLE "studio_condiciones_comerciales" 
ADD COLUMN IF NOT EXISTS "advance_type" TEXT DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS "advance_amount" DOUBLE PRECISION;

-- Set default value for existing records
UPDATE "studio_condiciones_comerciales"
SET "advance_type" = 'percentage'
WHERE "advance_type" IS NULL;

-- Add comments
COMMENT ON COLUMN "studio_condiciones_comerciales"."advance_type" IS 'Tipo de anticipo: percentage (porcentaje) | fixed_amount (monto fijo)';
COMMENT ON COLUMN "studio_condiciones_comerciales"."advance_amount" IS 'Monto fijo de anticipo cuando advance_type = fixed_amount';
