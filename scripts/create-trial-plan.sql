-- Plan Trial: 7 días, usado en onboarding (createStudioAndSubscription)
-- Ejecutar en Supabase SQL Editor si no existe el plan con slug 'trial'

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
  gen_random_uuid()::text,
  'Trial',
  'trial',
  'Plan de prueba 7 días. Acceso a módulos core para evaluar la plataforma.',
  0,
  0,
  NULL,
  NULL,
  NULL,
  false,
  true,
  0,
  '{"modules": ["manager"], "support": "email", "analytics": "basic"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Límites del plan trial (igual que Starter para el periodo de prueba)
DO $$
DECLARE
  trial_plan_id TEXT;
BEGIN
  SELECT id INTO trial_plan_id FROM platform_plans WHERE slug = 'trial';
  IF trial_plan_id IS NOT NULL THEN
    INSERT INTO plan_limits (id, plan_id, limit_type, limit_value, unit)
    VALUES
      (gen_random_uuid()::text, trial_plan_id, 'EVENTS_PER_MONTH', 10, 'eventos'),
      (gen_random_uuid()::text, trial_plan_id, 'STORAGE_GB', 5, 'GB'),
      (gen_random_uuid()::text, trial_plan_id, 'TEAM_MEMBERS', 3, 'usuarios'),
      (gen_random_uuid()::text, trial_plan_id, 'PORTFOLIOS', 2, 'portfolios')
    ON CONFLICT (plan_id, limit_type) DO NOTHING;
  END IF;
END $$;

-- Verificar
SELECT id, name, slug, active, "order", price_monthly, price_yearly
FROM platform_plans
WHERE slug = 'trial';
