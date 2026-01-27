-- Migration: Fix pipeline stages order
-- Date: 2026-01-27
-- Description: Asegura que todas las etapas del pipeline tengan el orden correcto:
--              0: nuevo (pending)
--              1: seguimiento (negotiation)
--              2: en cierre (closing)
--              3: aprobado (approved)
--              4: archivado (archived)
--              5: cancelado (canceled)

DO $$
DECLARE
  studio_record RECORD;
BEGIN
  FOR studio_record IN SELECT id FROM studios WHERE is_active = true
  LOOP
    -- Actualizar orden de todas las etapas según el orden correcto
    UPDATE studio_promise_pipeline_stages
    SET "order" = 0, updated_at = NOW()
    WHERE studio_id = studio_record.id AND slug = 'pending';
    
    UPDATE studio_promise_pipeline_stages
    SET "order" = 1, updated_at = NOW()
    WHERE studio_id = studio_record.id AND slug = 'negotiation';
    
    UPDATE studio_promise_pipeline_stages
    SET "order" = 2, updated_at = NOW()
    WHERE studio_id = studio_record.id AND slug = 'closing';
    
    UPDATE studio_promise_pipeline_stages
    SET "order" = 3, updated_at = NOW()
    WHERE studio_id = studio_record.id AND slug = 'approved';
    
    UPDATE studio_promise_pipeline_stages
    SET "order" = 4, updated_at = NOW()
    WHERE studio_id = studio_record.id AND slug = 'archived';
    
    UPDATE studio_promise_pipeline_stages
    SET "order" = 5, updated_at = NOW()
    WHERE studio_id = studio_record.id AND slug = 'canceled';
    
    RAISE NOTICE '✅ Orden de etapas corregido para studio: %', studio_record.id;
  END LOOP;
END $$;
