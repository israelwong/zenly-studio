-- Migration: Migrate demo-studio to prosocial with unlimited plan
-- Date: 2026-01-07
-- Description: Cambia el slug de demo-studio a prosocial y asigna plan unlimited
-- 
-- Cambios:
-- - slug: "demo-studio" → "prosocial"
-- - plan_id: Cambiar al plan "unlimited"
-- - subscription_status: "TRIAL" → "UNLIMITED"
-- - Actualizar studio_slug en user_metadata de usuarios asociados

BEGIN;

-- 1. Verificar que existe el plan unlimited
DO $$
DECLARE
  unlimited_plan_id TEXT;
  demo_studio_id TEXT;
BEGIN
  -- Obtener ID del plan unlimited
  SELECT id INTO unlimited_plan_id FROM platform_plans WHERE slug = 'unlimited';
  
  IF unlimited_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan unlimited no encontrado. Ejecuta scripts/create-unlimited-plan.sql primero.';
  END IF;

  -- Obtener ID del demo-studio
  SELECT id INTO demo_studio_id FROM studios WHERE slug = 'demo-studio';
  
  IF demo_studio_id IS NULL THEN
    RAISE EXCEPTION 'Studio demo-studio no encontrado.';
  END IF;

  -- 2. Actualizar el studio: slug, plan y subscription_status
  UPDATE studios
  SET
    slug = 'prosocial',
    plan_id = unlimited_plan_id,
    subscription_status = 'UNLIMITED',
    subscription_start = NOW(),
    subscription_end = NULL, -- Sin fecha de fin para unlimited
    updated_at = NOW()
  WHERE id = demo_studio_id;

  RAISE NOTICE 'Studio actualizado: demo-studio → prosocial (Plan: Unlimited)';

  -- 3. Nota: Actualizar studio_slug en user_metadata de auth.users
  -- Esto NO se puede hacer desde SQL, requiere Supabase Admin API
  -- Ejecutar: npx tsx scripts/migrate-demo-to-prosocial.ts
  RAISE NOTICE 'IMPORTANTE: Ejecutar script TypeScript para actualizar user_metadata en auth.users';

END $$;

-- 4. Verificar actualización
SELECT 
  id,
  studio_name,
  slug,
  email,
  plan_id,
  subscription_status,
  subscription_start,
  subscription_end,
  updated_at
FROM studios
WHERE slug = 'prosocial';

-- 5. Verificar plan asignado
SELECT 
  s.slug as studio_slug,
  s.studio_name,
  p.name as plan_name,
  p.slug as plan_slug,
  s.subscription_status
FROM studios s
JOIN platform_plans p ON s.plan_id = p.id
WHERE s.slug = 'prosocial';

COMMIT;

