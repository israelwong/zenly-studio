-- Solución Rápida: Eliminar duplicados y sincronizar con event_date
-- Ejecutar este SQL para limpiar inmediatamente

-- ============================================================================
-- PASO 1: Ver qué duplicados hay ANTES de eliminar (EJECUTAR PRIMERO)
-- ============================================================================
SELECT 
  a.id as agenda_id,
  a.evento_id,
  a.date as fecha_agenda,
  DATE(a.date) as fecha_agenda_dia,
  e.event_date as fecha_evento,
  DATE(e.event_date) as fecha_evento_dia,
  (DATE(a.date) - DATE(e.event_date)) as diferencia_dias,
  a.concept,
  a.created_at
FROM studio_agenda a
INNER JOIN studio_eventos e ON a.evento_id = e.id
WHERE 
  a.evento_id IS NOT NULL 
  AND a.contexto = 'evento'
ORDER BY a.evento_id, a.date;

-- ============================================================================
-- PASO 2: ELIMINAR agendas con fecha diferente al evento (EJECUTAR ESTO)
-- ============================================================================
DELETE FROM studio_agenda
WHERE id IN (
  SELECT a.id
  FROM studio_agenda a
  INNER JOIN studio_eventos e ON a.evento_id = e.id
  WHERE 
    a.evento_id IS NOT NULL 
    AND a.contexto = 'evento'
    AND e.event_date IS NOT NULL
    AND DATE(a.date) != DATE(e.event_date)
);

-- ============================================================================
-- PASO 3: Eliminar duplicados restantes (mismo evento, misma fecha)
-- ============================================================================
WITH ranked_agendas AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY evento_id, DATE(date)
      ORDER BY created_at DESC NULLS LAST, id DESC
    ) as rn
  FROM studio_agenda
  WHERE 
    evento_id IS NOT NULL 
    AND contexto = 'evento'
)
DELETE FROM studio_agenda
WHERE id IN (
  SELECT id 
  FROM ranked_agendas 
  WHERE rn > 1
);

-- ============================================================================
-- PASO 4: Crear agendas faltantes con fecha correcta del evento
-- ============================================================================
-- Nota: Generamos ID usando gen_random_uuid()::text (alternativa a CUID en SQL)
INSERT INTO studio_agenda (
  id,
  studio_id,
  evento_id,
  promise_id,
  date,
  concept,
  address,
  contexto,
  status,
  created_at,
  updated_at
)
SELECT 
  gen_random_uuid()::text as id,
  e.studio_id,
  e.id as evento_id,
  e.promise_id,
  (DATE_TRUNC('day', e.event_date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '12 hours' as date,
  COALESCE(
    p.name || CASE WHEN et.name IS NOT NULL THEN ' (' || et.name || ')' ELSE '' END,
    et.name,
    'Evento'
  ) as concept,
  COALESCE(p.event_location, c.address) as address,
  'evento' as contexto,
  'pendiente' as status,
  NOW() as created_at,
  NOW() as updated_at
FROM studio_eventos e
LEFT JOIN studio_promises p ON e.promise_id = p.id
LEFT JOIN studio_event_types et ON e.event_type_id = et.id
LEFT JOIN studio_contacts c ON e.contact_id = c.id
WHERE 
  e.event_date IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 
    FROM studio_agenda a 
    WHERE a.evento_id = e.id 
    AND a.contexto = 'evento'
    AND DATE(a.date) = DATE(e.event_date)
  );

-- ============================================================================
-- PASO 5: Actualizar fechas de agendas existentes para que coincidan
-- ============================================================================
UPDATE studio_agenda a
SET 
  date = (DATE_TRUNC('day', e.event_date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC') + INTERVAL '12 hours',
  updated_at = NOW()
FROM studio_eventos e
WHERE 
  a.evento_id = e.id
  AND a.contexto = 'evento'
  AND e.event_date IS NOT NULL
  AND DATE(a.date) != DATE(e.event_date);

-- ============================================================================
-- VERIFICACIÓN: Verificar que no queden duplicados
-- ============================================================================
SELECT 
  evento_id,
  DATE(date) as fecha_normalizada,
  COUNT(*) as cantidad,
  array_agg(id) as ids
FROM studio_agenda
WHERE 
  evento_id IS NOT NULL 
  AND contexto = 'evento'
GROUP BY evento_id, DATE(date)
HAVING COUNT(*) > 1;
