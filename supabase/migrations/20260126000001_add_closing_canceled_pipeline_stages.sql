-- Migration: Add closing and canceled pipeline stages
-- Date: 2026-01-26
-- Description: Agrega stages "En Cierre" y "Cancelada" a todos los studios

DO $$
DECLARE
  studio_record RECORD;
BEGIN
  FOR studio_record IN SELECT id, studio_name FROM studios WHERE is_active = true
  LOOP
    -- Agregar stage "En Cierre" (order 2 - antes de approved)
    INSERT INTO studio_promise_pipeline_stages (
      id, studio_id, name, slug, color, "order", is_system, is_active, created_at, updated_at
    )
    VALUES (
      gen_random_uuid()::text,
      studio_record.id,
      'En Cierre',
      'closing',
      '#F59E0B',
      2,
      true,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (studio_id, slug) DO UPDATE
    SET
      name = EXCLUDED.name,
      color = EXCLUDED.color,
      "order" = EXCLUDED."order",
      is_active = true,
      updated_at = NOW();

    -- Actualizar order de "Aprobada" a 3 (después de closing)
    UPDATE studio_promise_pipeline_stages
    SET
      "order" = 3,
      updated_at = NOW()
    WHERE studio_id = studio_record.id
      AND slug = 'approved';

    -- Agregar stage "Cancelada" (order 5)
    INSERT INTO studio_promise_pipeline_stages (
      id, studio_id, name, slug, color, "order", is_system, is_active, created_at, updated_at
    )
    VALUES (
      gen_random_uuid()::text,
      studio_record.id,
      'Cancelada',
      'canceled',
      '#EF4444',
      5,
      true,
      true,
      NOW(),
      NOW()
    )
    ON CONFLICT (studio_id, slug) DO UPDATE
    SET
      name = EXCLUDED.name,
      color = EXCLUDED.color,
      "order" = EXCLUDED."order",
      is_active = true,
      updated_at = NOW();

    -- Actualizar order de "Archivada" a 4 (después de approved)
    UPDATE studio_promise_pipeline_stages
    SET
      "order" = 4,
      updated_at = NOW()
    WHERE studio_id = studio_record.id
      AND slug = 'archived';

    RAISE NOTICE '✅ Stages agregados para studio: %', studio_record.studio_name;
  END LOOP;
END $$;
