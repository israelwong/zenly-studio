-- Script para crear el plan "Unlimited" en platform_plans
-- Uso: Ejecutar en Supabase SQL Editor después de crear el plan en la UI o manualmente
-- 
-- Este plan es para cuentas especiales (prosocial, pruebas internas, convenios)
-- que tienen acceso completo sin límites de tiempo y sin suscripción en Stripe

BEGIN;

-- Crear plan Unlimited
INSERT INTO platform_plans (
  id,
  name,
  slug,
  description,
  price_monthly,
  price_yearly,
  stripe_price_id,
  stripe_price_id_yearly,
  stripe_product_id,
  popular,
  active,
  "order",
  features,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid()::text, -- O usar un CUID específico si prefieres
  'Plan Ilimitado',
  'unlimited',
  'Plan especial con acceso completo sin límites de tiempo. Gestionado manualmente.',
  0,
  0,
  NULL, -- Sin Stripe
  NULL, -- Sin Stripe
  NULL, -- Sin Stripe
  false,
  true,
  999, -- Orden alto para que no aparezca en listas normales
  '{"highlights": ["Acceso completo a todos los módulos", "Sin límites de tiempo", "Sin límites de uso", "Soporte prioritario"], "modules": ["manager", "magic", "marketing", "payment", "conversations", "cloud", "invitation"]}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Obtener el ID del plan creado
DO $$
DECLARE
  unlimited_plan_id TEXT;
BEGIN
  SELECT id INTO unlimited_plan_id FROM platform_plans WHERE slug = 'unlimited';
  
  IF unlimited_plan_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo crear o encontrar el plan unlimited';
  END IF;

  -- Crear límites ilimitados para el plan
  INSERT INTO plan_limits (id, plan_id, limit_type, limit_value, unit)
  VALUES
    (gen_random_uuid()::text, unlimited_plan_id, 'EVENTS_PER_MONTH', -1, 'eventos'),
    (gen_random_uuid()::text, unlimited_plan_id, 'STORAGE_GB', -1, 'GB'),
    (gen_random_uuid()::text, unlimited_plan_id, 'TEAM_MEMBERS', -1, 'miembros'),
    (gen_random_uuid()::text, unlimited_plan_id, 'PORTFOLIOS', -1, 'portfolios'),
    (gen_random_uuid()::text, unlimited_plan_id, 'GANTT_TEMPLATES', -1, 'plantillas')
  ON CONFLICT (plan_id, limit_type) DO NOTHING;

  RAISE NOTICE 'Plan Unlimited creado con ID: %', unlimited_plan_id;
END $$;

-- Verificar creación
SELECT 
  id,
  name,
  slug,
  price_monthly,
  price_yearly,
  active,
  "order"
FROM platform_plans
WHERE slug = 'unlimited';

COMMIT;

