-- Diagnóstico: Ver cómo está guardada la promesa "Shirel (Xv Años)"
-- Objetivo: Entender si el problema está en la DB o en el renderizado

-- ============================================================================
-- CONSULTA 1: Buscar la promesa "Shirel"
-- ============================================================================
SELECT 
  p.id as promise_id,
  p.name as promise_name,
  p.event_date,
  p.defined_date,
  p.tentative_dates,
  p.pipeline_stage_id,
  ps.slug as stage_slug,
  ps.name as stage_name,
  p.created_at,
  p.updated_at
FROM studio_promises p
LEFT JOIN studio_manager_pipeline_stages ps ON p.pipeline_stage_id = ps.id
WHERE 
  p.name ILIKE '%Shirel%'
  OR p.name ILIKE '%Xv%'
ORDER BY p.created_at DESC;

-- ============================================================================
-- CONSULTA 2: Ver agendas relacionadas con esta promesa
-- ============================================================================
SELECT 
  a.id as agenda_id,
  a.promise_id,
  a.evento_id,
  a.date as agenda_date,
  DATE(a.date) as agenda_date_only,
  a.concept,
  a.contexto,
  a.status,
  a.created_at as agenda_created_at,
  p.name as promise_name,
  e.event_date as evento_date,
  DATE(e.event_date) as evento_date_only
FROM studio_agenda a
LEFT JOIN studio_promises p ON a.promise_id = p.id
LEFT JOIN studio_eventos e ON a.evento_id = e.id
WHERE 
  p.name ILIKE '%Shirel%'
  OR p.name ILIKE '%Xv%'
ORDER BY a.date ASC;

-- ============================================================================
-- CONSULTA 3: Ver eventos asociados a esta promesa
-- ============================================================================
SELECT 
  e.id as evento_id,
  e.promise_id,
  e.event_date,
  DATE(e.event_date) as event_date_only,
  e.status as evento_status,
  e.created_at as evento_created_at,
  p.name as promise_name
FROM studio_eventos e
INNER JOIN studio_promises p ON e.promise_id = p.id
WHERE 
  p.name ILIKE '%Shirel%'
  OR p.name ILIKE '%Xv%'
ORDER BY e.event_date ASC;

-- ============================================================================
-- CONSULTA 4: Ver todas las fechas tentativas parseadas
-- ============================================================================
SELECT 
  p.id,
  p.name,
  p.tentative_dates,
  -- Intentar parsear cada fecha del array
  jsonb_array_elements_text(p.tentative_dates::jsonb) as fecha_tentativa_raw,
  jsonb_array_elements_text(p.tentative_dates::jsonb)::date as fecha_tentativa_parsed,
  DATE(jsonb_array_elements_text(p.tentative_dates::jsonb)::date) as fecha_tentativa_date_only
FROM studio_promises p
WHERE 
  (p.name ILIKE '%Shirel%' OR p.name ILIKE '%Xv%')
  AND p.tentative_dates IS NOT NULL
ORDER BY p.id, fecha_tentativa_parsed;

-- ============================================================================
-- CONSULTA 5: Verificar si hay duplicados en tentative_dates
-- ============================================================================
WITH fechas_tentativas AS (
  SELECT 
    p.id,
    p.name,
    jsonb_array_elements_text(p.tentative_dates::jsonb)::date as fecha
  FROM studio_promises p
  WHERE 
    (p.name ILIKE '%Shirel%' OR p.name ILIKE '%Xv%')
    AND p.tentative_dates IS NOT NULL
)
SELECT 
  id,
  name,
  fecha,
  DATE(fecha) as fecha_date_only,
  COUNT(*) OVER (PARTITION BY id, DATE(fecha)) as cantidad_duplicados
FROM fechas_tentativas
ORDER BY id, fecha;
