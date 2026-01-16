-- Migración: Solución definitiva para duplicados en studio_agenda
-- Fecha: Enero 2026
-- Objetivo: Eliminar duplicados y sincronizar fechas de agenda con fechas de eventos

-- ============================================================================
-- PASO 1: Eliminar TODAS las agendas de eventos que no coincidan con event_date
-- ============================================================================
-- Primero, eliminar agendas que tienen fecha diferente a la del evento
-- Esto elimina las entradas con fecha anterior/posterior que causan los rangos incorrectos
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
-- PASO 2: Eliminar duplicados restantes (mismo evento_id, misma fecha)
-- ============================================================================
-- Mantener solo la entrada más reciente para cada combinación de evento_id + fecha
WITH ranked_agendas AS (
  SELECT 
    id,
    evento_id,
    date,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        evento_id,
        DATE(date)
      ORDER BY 
        created_at DESC NULLS LAST,
        id DESC
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
-- PASO 3: Crear/Actualizar agenda para eventos que no tienen agenda o tienen fecha incorrecta
-- ============================================================================
-- Insertar agendas faltantes o corregir fechas usando la fecha del evento
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
  -- Normalizar fecha del evento a mediodía UTC
  DATE_TRUNC('day', e.event_date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' + INTERVAL '12 hours' as date,
  -- Construir concepto desde el nombre del evento o tipo
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
-- PASO 4: Actualizar fechas de agendas existentes para que coincidan con event_date
-- ============================================================================
UPDATE studio_agenda a
SET 
  date = (
    DATE_TRUNC('day', e.event_date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
  ) + INTERVAL '12 hours',
  updated_at = NOW()
FROM studio_eventos e
WHERE 
  a.evento_id = e.id
  AND a.contexto = 'evento'
  AND e.event_date IS NOT NULL
  AND DATE(a.date) != DATE(e.event_date);

-- ============================================================================
-- PASO 5: Verificación final
-- ============================================================================
-- Esta consulta debería retornar 0 filas si todo está correcto
SELECT 
  evento_id,
  DATE(date) as fecha_normalizada,
  COUNT(*) as cantidad
FROM studio_agenda
WHERE 
  evento_id IS NOT NULL 
  AND contexto = 'evento'
GROUP BY evento_id, DATE(date)
HAVING COUNT(*) > 1;
