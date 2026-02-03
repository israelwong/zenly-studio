-- ============================================
-- MIGRACIÓN: Sistema de Atribución de Comisiones
-- ============================================
-- Agrega campos para rastrear atribución de comisiones en promises
-- y políticas de distribución en configuraciones

-- ============================================
-- ENUM: PromiseReferrerType
-- ============================================
CREATE TYPE "PromiseReferrerType" AS ENUM (
  'STAFF',
  'CONTACT'
);

-- ============================================
-- TABLA: studio_configuraciones
-- Agregar campos de políticas de atribución
-- ============================================
ALTER TABLE "studio_configuraciones"
  ADD COLUMN IF NOT EXISTS "referral_split_percentage" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS "fixed_contact_incentive" DOUBLE PRECISION NOT NULL DEFAULT 1000;

COMMENT ON COLUMN "studio_configuraciones"."referral_split_percentage" IS 'Porcentaje del pool de comisión para referidos staff (0.5 = 50%)';
COMMENT ON COLUMN "studio_configuraciones"."fixed_contact_incentive" IS 'Monto fijo MXN para referidos de contactos';

-- ============================================
-- TABLA: studio_promises
-- Agregar campos de atribución de comisiones
-- ============================================
ALTER TABLE "studio_promises"
  ADD COLUMN IF NOT EXISTS "sales_agent_id" TEXT,
  ADD COLUMN IF NOT EXISTS "referrer_id" TEXT,
  ADD COLUMN IF NOT EXISTS "referrer_type" "PromiseReferrerType",
  ADD COLUMN IF NOT EXISTS "commission_payout_total" DOUBLE PRECISION;

COMMENT ON COLUMN "studio_promises"."sales_agent_id" IS 'FK a studio_users - Agente de ventas asignado';
COMMENT ON COLUMN "studio_promises"."referrer_id" IS 'ID del referidor (puede ser studio_users, studio_crew_members o studio_contacts)';
COMMENT ON COLUMN "studio_promises"."referrer_type" IS 'Tipo de referidor: STAFF | CONTACT';
COMMENT ON COLUMN "studio_promises"."commission_payout_total" IS 'Monto total calculado de comisión al momento del cierre';

-- ============================================
-- FOREIGN KEYS
-- ============================================
-- Agregar FK de sales_agent_id a studio_users
ALTER TABLE "studio_promises"
  ADD CONSTRAINT "studio_promises_sales_agent_id_fkey"
  FOREIGN KEY ("sales_agent_id")
  REFERENCES "studio_users"("id")
  ON DELETE SET NULL;

-- ============================================
-- ÍNDICES
-- ============================================
CREATE INDEX IF NOT EXISTS "studio_promises_sales_agent_id_idx"
  ON "studio_promises"("sales_agent_id");

CREATE INDEX IF NOT EXISTS "studio_promises_referrer_id_referrer_type_idx"
  ON "studio_promises"("referrer_id", "referrer_type");

-- ============================================
-- VALIDACIONES
-- ============================================
-- Asegurar que referral_split_percentage esté entre 0 y 1
ALTER TABLE "studio_configuraciones"
  ADD CONSTRAINT "studio_configuraciones_referral_split_percentage_check"
  CHECK ("referral_split_percentage" >= 0 AND "referral_split_percentage" <= 1);

-- Asegurar que fixed_contact_incentive sea positivo
ALTER TABLE "studio_configuraciones"
  ADD CONSTRAINT "studio_configuraciones_fixed_contact_incentive_check"
  CHECK ("fixed_contact_incentive" >= 0);

-- Asegurar que commission_payout_total sea positivo si existe
ALTER TABLE "studio_promises"
  ADD CONSTRAINT "studio_promises_commission_payout_total_check"
  CHECK ("commission_payout_total" IS NULL OR "commission_payout_total" >= 0);
