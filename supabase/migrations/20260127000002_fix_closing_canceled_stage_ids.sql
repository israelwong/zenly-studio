-- Migration: Fix closing and canceled pipeline stage IDs
-- Date: 2026-01-27
-- Description: Corrige los IDs de las etapas "closing" y "canceled" que fueron creadas con UUIDs
--              y los reemplaza con CUIDs válidos generados por Prisma

-- Función para generar un CUID válido (formato: c + 25 caracteres alfanuméricos)
-- Nota: Esta es una aproximación simple. Los CUIDs reales tienen más complejidad,
-- pero esto cumple con el patrón básico requerido por Zod: /^[cC][^\s-]{8,}$/
CREATE OR REPLACE FUNCTION generate_cuid_like_id() RETURNS TEXT AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
  counter_part TEXT;
BEGIN
  -- Parte 1: Timestamp en base36 (aproximación)
  timestamp_part := lpad(to_hex(extract(epoch from now())::bigint), 8, '0');
  
  -- Parte 2: Parte aleatoria (12 caracteres)
  random_part := lower(
    substring(
      md5(random()::text || clock_timestamp()::text),
      1, 12
    )
  );
  
  -- Parte 3: Contador/entropía (5 caracteres)
  counter_part := lower(
    substring(
      md5(random()::text || now()::text),
      1, 5
    )
  );
  
  -- Combinar: 'c' + timestamp + random + counter (total ~26 caracteres, cumple con /^[cC][^\s-]{8,}$/)
  RETURN 'c' || timestamp_part || random_part || counter_part;
END;
$$ LANGUAGE plpgsql;

-- Actualizar IDs de etapas "closing" y "canceled" que no son CUIDs válidos
DO $$
DECLARE
  stage_record RECORD;
  new_id TEXT;
  old_id TEXT;
BEGIN
  FOR stage_record IN 
    SELECT 
      s.id,
      s.studio_id,
      s.slug,
      s.name
    FROM studio_promise_pipeline_stages s
    WHERE s.slug IN ('closing', 'canceled')
      AND NOT (s.id ~ '^[cC][^\s-]{8,}$') -- No cumple con patrón CUID
  LOOP
    old_id := stage_record.id;
    new_id := generate_cuid_like_id();
    
    -- Verificar que el nuevo ID no exista
    WHILE EXISTS (SELECT 1 FROM studio_promise_pipeline_stages WHERE id = new_id) LOOP
      new_id := generate_cuid_like_id();
    END LOOP;
    
    -- Actualizar el ID de la etapa
    UPDATE studio_promise_pipeline_stages
    SET id = new_id
    WHERE id = old_id;
    
    -- Actualizar todas las referencias en studio_promises
    UPDATE studio_promises
    SET pipeline_stage_id = new_id
    WHERE pipeline_stage_id = old_id;
    
    -- Actualizar referencias en historial de estados
    UPDATE studio_promise_status_history
    SET from_stage_id = new_id
    WHERE from_stage_id = old_id;
    
    UPDATE studio_promise_status_history
    SET to_stage_id = new_id
    WHERE to_stage_id = old_id;
    
    RAISE NOTICE '✅ Actualizado stage % (slug: %) de % a %', 
      stage_record.name, 
      stage_record.slug, 
      old_id, 
      new_id;
  END LOOP;
END $$;

-- Limpiar función temporal
DROP FUNCTION IF EXISTS generate_cuid_like_id();
