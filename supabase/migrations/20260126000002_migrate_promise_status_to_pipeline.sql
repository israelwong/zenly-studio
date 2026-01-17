-- Migration: Migrate promise status to pipeline stages
-- Date: 2026-01-26
-- Description: Migra los valores de status a pipeline_stage_id y crea registros iniciales en historial

DO $$
DECLARE
  promise_record RECORD;
  stage_record RECORD;
  stage_slug TEXT;
BEGIN
  -- Iterar sobre todas las promesas que tienen status pero no pipeline_stage_id
  FOR promise_record IN 
    SELECT 
      p.id,
      p.studio_id,
      p.status,
      p.pipeline_stage_id
    FROM studio_promises p
    WHERE p.status IS NOT NULL
      AND (p.pipeline_stage_id IS NULL OR p.pipeline_stage_id = '')
  LOOP
    -- Mapear status antiguo a slug de stage
    CASE promise_record.status
      WHEN 'pending' THEN stage_slug := 'pending';
      WHEN 'pendiente' THEN stage_slug := 'pending';
      WHEN 'negotiation' THEN stage_slug := 'negotiation';
      WHEN 'negociacion' THEN stage_slug := 'negotiation';
      WHEN 'approved' THEN stage_slug := 'approved';
      WHEN 'aprobada' THEN stage_slug := 'approved';
      WHEN 'autorizada' THEN stage_slug := 'approved';
      WHEN 'closing' THEN stage_slug := 'closing';
      WHEN 'cierre' THEN stage_slug := 'closing';
      WHEN 'en_cierre' THEN stage_slug := 'closing';
      WHEN 'archived' THEN stage_slug := 'archived';
      WHEN 'archivada' THEN stage_slug := 'archived';
      WHEN 'canceled' THEN stage_slug := 'canceled';
      WHEN 'cancelada' THEN stage_slug := 'canceled';
      ELSE stage_slug := 'pending'; -- Default fallback
    END CASE;

    -- Buscar el stage correspondiente
    SELECT id INTO stage_record
    FROM studio_promise_pipeline_stages
    WHERE studio_id = promise_record.studio_id
      AND slug = stage_slug
      AND is_active = true
    LIMIT 1;

    -- Si no existe el stage, usar 'pending' como fallback
    IF stage_record IS NULL THEN
      SELECT id INTO stage_record
      FROM studio_promise_pipeline_stages
      WHERE studio_id = promise_record.studio_id
        AND slug = 'pending'
        AND is_active = true
      LIMIT 1;
    END IF;

    -- Si encontramos un stage, actualizar la promesa
    IF stage_record IS NOT NULL THEN
      -- Actualizar pipeline_stage_id
      UPDATE studio_promises
      SET pipeline_stage_id = stage_record.id
      WHERE id = promise_record.id;

      -- Crear registro inicial en historial (sin from_stage ya que es migración)
      INSERT INTO studio_promise_status_history (
        id,
        promise_id,
        from_stage_id,
        to_stage_id,
        from_stage_slug,
        to_stage_slug,
        user_id,
        reason,
        metadata,
        created_at
      )
      VALUES (
        gen_random_uuid()::text,
        promise_record.id,
        NULL, -- No tenemos el stage anterior
        stage_record.id,
        NULL, -- No tenemos el slug anterior
        stage_slug,
        NULL, -- No tenemos el usuario que hizo el cambio original
        'Migración inicial de status a pipeline stage',
        jsonb_build_object(
          'migration', true,
          'original_status', promise_record.status
        ),
        NOW()
      )
      ON CONFLICT DO NOTHING; -- Evitar duplicados si se ejecuta múltiples veces

      RAISE NOTICE '✅ Migrada promesa %: status "%" → stage "%"', 
        promise_record.id, promise_record.status, stage_slug;
    ELSE
      RAISE WARNING '⚠️  No se encontró stage para promesa % con status "%"', 
        promise_record.id, promise_record.status;
    END IF;
  END LOOP;

  RAISE NOTICE '✅ Migración completada';
END $$;

-- Comentario
COMMENT ON COLUMN studio_promises.status IS 'DEPRECATED: Usar pipeline_stage_id. Este campo será eliminado en futuras versiones.';
