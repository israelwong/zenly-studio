-- Migration: Fix prosocial studio to have unlimited plan
-- Date: 2026-01-08
-- Description: Asegura que el studio prosocial tenga el plan unlimited asignado
-- 
-- Cambios:
-- - Verificar y corregir plan_id del studio prosocial
-- - Asegurar subscription_status = 'UNLIMITED'

BEGIN;

-- 1. Verificar que existe el plan unlimited
DO $$
DECLARE
  unlimited_plan_id TEXT;
  prosocial_studio_id TEXT;
  current_plan_id TEXT;
  current_plan_slug TEXT;
BEGIN
  -- Obtener ID del plan unlimited
  SELECT id INTO unlimited_plan_id FROM platform_plans WHERE slug = 'unlimited';
  
  IF unlimited_plan_id IS NULL THEN
    RAISE EXCEPTION 'Plan unlimited no encontrado. Verifica que existe en platform_plans.';
  END IF;

  -- Obtener ID del studio prosocial
  SELECT id, plan_id INTO prosocial_studio_id, current_plan_id 
  FROM studios 
  WHERE slug = 'prosocial';
  
  IF prosocial_studio_id IS NULL THEN
    RAISE EXCEPTION 'Studio prosocial no encontrado.';
  END IF;

  -- Verificar plan actual
  IF current_plan_id IS NOT NULL THEN
    SELECT slug INTO current_plan_slug 
    FROM platform_plans 
    WHERE id = current_plan_id;
    
    RAISE NOTICE 'Plan actual del studio prosocial: % (ID: %)', current_plan_slug, current_plan_id;
  ELSE
    RAISE NOTICE 'Studio prosocial no tiene plan asignado';
  END IF;

  -- Actualizar el studio al plan unlimited si no lo tiene ya
  IF current_plan_id IS NULL OR current_plan_id != unlimited_plan_id THEN
    UPDATE studios
    SET
      plan_id = unlimited_plan_id,
      subscription_status = 'UNLIMITED',
      subscription_start = COALESCE(subscription_start, NOW()),
      subscription_end = NULL, -- Sin fecha de fin para unlimited
      updated_at = NOW()
    WHERE id = prosocial_studio_id;

    RAISE NOTICE 'Studio prosocial actualizado al plan unlimited (ID: %)', unlimited_plan_id;
  ELSE
    RAISE NOTICE 'Studio prosocial ya tiene el plan unlimited asignado';
  END IF;

END $$;

-- 2. Verificar actualización
SELECT 
  s.id,
  s.studio_name,
  s.slug,
  s.email,
  s.plan_id,
  s.subscription_status,
  s.subscription_start,
  s.subscription_end,
  p.name as plan_name,
  p.slug as plan_slug,
  s.updated_at
FROM studios s
LEFT JOIN platform_plans p ON s.plan_id = p.id
WHERE s.slug = 'prosocial';

COMMIT;

