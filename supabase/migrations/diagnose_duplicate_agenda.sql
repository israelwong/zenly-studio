-- SQL de Diagnóstico: Identificar duplicados y fechas incorrectas en studio_agenda
-- Ejecutar para ver qué está pasando con las fechas

-- ============================================================================
-- CONSULTA 1: Ver todos los eventos con múltiples entradas de agenda
-- ============================================================================
SELECT 
  evento_id,
  DATE(date) as fecha_normalizada,
  COUNT(*) as cantidad_duplicados,
  array_agg(id ORDER BY created_at DESC) as ids,
  array_agg(date ORDER BY created_at DESC) as fechas,
  array_agg(created_at ORDER BY created_at DESC) as fechas_creacion,
  array_agg(concept ORDER BY created_at DESC) as conceptos
FROM studio_agenda
WHERE 
  evento_id IS NOT NULL 
  AND contexto = 'evento'
GROUP BY evento_id, DATE(date)
HAVING COUNT(*) > 1
ORDER BY evento_id, fecha_normalizada;

-- ============================================================================
-- CONSULTA 2: Ver eventos con fechas que difieren en 1 día
-- ============================================================================
WITH eventos_con_fechas AS (
  SELECT 
    evento_id,
    id,
    date,
    DATE(date) as fecha_dia,
    created_at,
    concept
  FROM studio_agenda
  WHERE 
    evento_id IS NOT NULL 
    AND contexto = 'evento'
)
SELECT 
  e1.evento_id,
  e1.id as id_fecha_1,
  e1.date as fecha_1,
  e1.fecha_dia as dia_1,
  e2.id as id_fecha_2,
  e2.date as fecha_2,
  e2.fecha_dia as dia_2,
  (e2.fecha_dia - e1.fecha_dia) as diferencia_dias,
  e1.created_at as creado_1,
  e2.created_at as creado_2,
  e1.concept as concepto_1,
  e2.concept as concepto_2
FROM eventos_con_fechas e1
INNER JOIN eventos_con_fechas e2 
  ON e1.evento_id = e2.evento_id 
  AND e1.id < e2.id
WHERE 
  ABS(e2.fecha_dia - e1.fecha_dia) <= 1
ORDER BY e1.evento_id, e1.fecha_dia;

-- ============================================================================
-- CONSULTA 3: Comparar fecha del evento con fecha de agenda
-- ============================================================================
SELECT 
  a.id as agenda_id,
  a.evento_id,
  a.date as fecha_agenda,
  DATE(a.date) as fecha_agenda_dia,
  e.event_date as fecha_evento,
  DATE(e.event_date) as fecha_evento_dia,
  (DATE(a.date) - DATE(e.event_date)) as diferencia_dias,
  a.created_at as agenda_creada,
  a.concept,
  CASE 
    WHEN DATE(a.date) = DATE(e.event_date) THEN '✅ Correcta'
    WHEN DATE(a.date) < DATE(e.event_date) THEN '❌ Anterior'
    WHEN DATE(a.date) > DATE(e.event_date) THEN '❌ Posterior'
  END as estado
FROM studio_agenda a
INNER JOIN studio_events e ON a.evento_id = e.id
WHERE 
  a.evento_id IS NOT NULL 
  AND a.contexto = 'evento'
  AND e.event_date IS NOT NULL
ORDER BY a.evento_id, a.date;

-- ============================================================================
-- CONSULTA 4: Ver eventos con fecha de evento pero sin agenda correspondiente
-- ============================================================================
SELECT 
  e.id as evento_id,
  e.event_date,
  DATE(e.event_date) as fecha_evento_dia,
  COUNT(a.id) as cantidad_agendas,
  array_agg(a.id) as agenda_ids,
  array_agg(DATE(a.date)) as fechas_agenda
FROM studio_eventos e
LEFT JOIN studio_agenda a ON a.evento_id = e.id AND a.contexto = 'evento'
WHERE e.event_date IS NOT NULL
GROUP BY e.id, e.event_date
HAVING COUNT(a.id) != 1 OR COUNT(a.id) = 0
ORDER BY e.id;
