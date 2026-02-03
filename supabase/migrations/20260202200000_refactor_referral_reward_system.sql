-- Migration: Refactor Referral Reward System
-- Date: 2026-02-02
-- Description: Remove fixed_contact_incentive, rename referral_split_percentage to referral_reward_value,
--              and add referral_reward_type enum for PERCENTAGE or FIXED rewards

-- Step 1: Create the new enum (only if it doesn't exist)
DO $$ BEGIN
    CREATE TYPE "ReferralRewardType" AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Drop the old constraints if they exist
ALTER TABLE "studio_configuraciones"
  DROP CONSTRAINT IF EXISTS "studio_configuraciones_referral_split_percentage_check";

ALTER TABLE "studio_configuraciones"
  DROP CONSTRAINT IF EXISTS "studio_configuraciones_fixed_contact_incentive_check";

-- Step 3: Add referral_reward_type column (only if it doesn't exist)
DO $$ BEGIN
    ALTER TABLE "studio_configuraciones"
      ADD COLUMN "referral_reward_type" "ReferralRewardType" NOT NULL DEFAULT 'PERCENTAGE';
EXCEPTION
    WHEN duplicate_column THEN null;
END $$;

-- Step 4: Rename referral_split_percentage to referral_reward_value (only if the old column exists)
DO $$ BEGIN
    ALTER TABLE "studio_configuraciones"
      RENAME COLUMN "referral_split_percentage" TO "referral_reward_value";
EXCEPTION
    WHEN undefined_column THEN null;
END $$;

-- Step 5: Remove fixed_contact_incentive column
ALTER TABLE "studio_configuraciones"
  DROP COLUMN IF EXISTS "fixed_contact_incentive";

-- Step 6: Update existing records to ensure referral_reward_value is valid
-- If reward_type is PERCENTAGE, ensure value is between 0 and 1
-- If reward_type is FIXED, ensure value is positive
-- For existing records with PERCENTAGE (default), keep the existing value if it's <= 1, otherwise divide by 100
UPDATE "studio_configuraciones"
SET "referral_reward_value" = CASE
  WHEN "referral_reward_value" > 1 THEN "referral_reward_value" / 100.0
  ELSE "referral_reward_value"
END
WHERE "referral_reward_type" = 'PERCENTAGE';

-- Step 7: Drop old constraint if exists and add new check constraint
ALTER TABLE "studio_configuraciones"
  DROP CONSTRAINT IF EXISTS "referral_reward_value_check";

ALTER TABLE "studio_configuraciones"
  ADD CONSTRAINT "referral_reward_value_check" CHECK (
    ("referral_reward_type" = 'PERCENTAGE' AND "referral_reward_value" >= 0 AND "referral_reward_value" <= 1) OR
    ("referral_reward_type" = 'FIXED' AND "referral_reward_value" >= 0)
  );

-- Step 8: Add comment for documentation
COMMENT ON COLUMN "studio_configuraciones"."referral_reward_type" IS 'Tipo de recompensa para referidos staff: PERCENTAGE (porcentaje del pool) o FIXED (monto fijo MXN)';
COMMENT ON COLUMN "studio_configuraciones"."referral_reward_value" IS 'Valor de la recompensa: porcentaje (0.0-1.0) si es PERCENTAGE, o monto fijo MXN si es FIXED';
