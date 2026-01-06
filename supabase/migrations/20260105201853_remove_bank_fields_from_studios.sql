-- Migration: Remove Bank Fields from studios table
-- Date: 2026-01-05
-- Description: Elimina campos bancarios redundantes de studios ya que:
--   1. Transferencias manuales → usar studio_metodos_pago (banco, beneficiario, cuenta_clabe)
--   2. Stripe Connect → Stripe maneja la info bancaria internamente
-- 
-- Changes:
-- 1. Migra datos existentes de studios a studio_metodos_pago si no existe método de transferencia
-- 2. Elimina campos bancarios de studios (account_holder, account_number, bank_name, clabe_number)
--
-- Notes:
-- - Los comprobantes ahora deben usar studio_metodos_pago para obtener info bancaria
-- - Para Stripe Connect, obtener info bancaria desde Stripe API si es necesario

-- ============================================
-- 1. Migrar datos bancarios existentes a studio_metodos_pago
-- ============================================
-- Solo migrar si el estudio tiene datos bancarios Y no tiene método de transferencia configurado
INSERT INTO "studio_metodos_pago" (
  "id",
  "studio_id",
  "payment_method",
  "payment_method_name",
  "status",
  "banco",
  "beneficiario",
  "cuenta_clabe",
  "is_manual",
  "available_for_quotes",
  "order",
  "created_at",
  "updated_at"
)
SELECT 
  gen_random_uuid()::text,
  s."id",
  'transferencia',
  'Transferencia a cuenta del negocio',
  CASE 
    WHEN s."clabe_number" IS NOT NULL AND s."bank_name" IS NOT NULL AND s."account_holder" IS NOT NULL 
    THEN 'active' 
    ELSE 'inactive' 
  END,
  s."bank_name",
  s."account_holder",
  s."clabe_number",
  true,
  true,
  2,
  now(),
  now()
FROM "studios" s
WHERE 
  -- Solo estudios con datos bancarios
  (s."bank_name" IS NOT NULL OR s."account_holder" IS NOT NULL OR s."clabe_number" IS NOT NULL)
  -- Y que NO tengan ya un método de transferencia configurado
  AND NOT EXISTS (
    SELECT 1 
    FROM "studio_metodos_pago" smp 
    WHERE smp."studio_id" = s."id" 
    AND smp."payment_method" IN ('transferencia', 'spei_directo')
  )
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. Eliminar campos bancarios de studios
-- ============================================
ALTER TABLE "studios" 
DROP COLUMN IF EXISTS "account_holder",
DROP COLUMN IF EXISTS "account_number",
DROP COLUMN IF EXISTS "bank_name",
DROP COLUMN IF EXISTS "clabe_number";

-- ============================================
-- 3. Comentarios de documentación
-- ============================================
COMMENT ON TABLE "studio_metodos_pago" IS 'Métodos de pago configurados por el estudio. Para transferencias manuales, usar campos banco, beneficiario, cuenta_clabe. Para Stripe Connect, usar stripe_account_id en studios.';

