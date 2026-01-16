-- Migración: Agregar metadata a agendas existentes
-- Fecha: 2026-01-16
-- Descripción: Actualiza agendas existentes con metadata según su tipo

-- =============================================================================
-- 1. ACTUALIZAR AGENDAS DE EVENTOS (contexto: 'evento')
-- =============================================================================

-- 1.1. Eventos principales (fecha coincide con event_date de la promesa)
UPDATE studio_agenda a
SET metadata = jsonb_build_object(
    'agenda_type', 'main_event_date',
    'sync_google', true,
    'google_calendar_type', 'primary',
    'is_main_event_date', true
)
FROM studio_eventos e
INNER JOIN studio_promises p ON e.promise_id = p.id
WHERE a.evento_id = e.id
  AND a.contexto = 'evento'
  AND a.type_scheduling IS NULL
  AND a.metadata IS NULL
  AND p.event_date IS NOT NULL
  AND DATE(a.date) = DATE(p.event_date);

-- 1.2. Eventos con citas (presencial/virtual)
UPDATE studio_agenda a
SET metadata = jsonb_build_object(
    'agenda_type', 'event_appointment',
    'sync_google', true,
    'google_calendar_type', 'primary'
)
WHERE a.contexto = 'evento'
  AND a.type_scheduling IN ('presencial', 'virtual')
  AND a.metadata IS NULL;

-- 1.3. Eventos sin fecha principal (otros eventos)
UPDATE studio_agenda a
SET metadata = jsonb_build_object(
    'agenda_type', 'main_event_date',
    'sync_google', true,
    'google_calendar_type', 'primary',
    'is_main_event_date', false
)
FROM studio_eventos e
INNER JOIN studio_promises p ON e.promise_id = p.id
WHERE a.evento_id = e.id
  AND a.contexto = 'evento'
  AND a.type_scheduling IS NULL
  AND a.metadata IS NULL
  AND (p.event_date IS NULL OR DATE(a.date) != DATE(p.event_date));

-- =============================================================================
-- 2. ACTUALIZAR AGENDAS DE PROMESAS (contexto: 'promise')
-- =============================================================================

-- 2.1. Promesas con citas comerciales (presencial/virtual)
UPDATE studio_agenda a
SET metadata = jsonb_build_object(
    'agenda_type', 'commercial_appointment',
    'sync_google', true,
    'google_calendar_type', 'primary'
)
WHERE a.contexto = 'promise'
  AND a.type_scheduling IN ('presencial', 'virtual')
  AND a.metadata IS NULL;

-- 2.2. Promesas con fecha de evento (sin cita comercial)
UPDATE studio_agenda a
SET metadata = jsonb_build_object(
    'agenda_type', 'event_date',
    'sync_google', false
)
WHERE a.contexto = 'promise'
  AND a.type_scheduling IS NULL
  AND a.metadata IS NULL;

-- =============================================================================
-- 3. CREAR AGENDAS FALTANTES PARA EVENTOS SIN AGENDA
-- =============================================================================

-- 3.1. Eventos que tienen event_date pero no tienen agenda
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
    metadata,
    created_at,
    updated_at
)
SELECT 
    gen_random_uuid()::text,
    e.studio_id,
    e.id,
    e.promise_id,
    p.event_date,
    COALESCE(p.name, et.name, 'Evento'),
    COALESCE(p.event_location, c.address),
    'evento',
    'pendiente',
    jsonb_build_object(
        'agenda_type', 'main_event_date',
        'sync_google', true,
        'google_calendar_type', 'primary',
        'is_main_event_date', true
    ),
    NOW(),
    NOW()
FROM studio_eventos e
INNER JOIN studio_promises p ON e.promise_id = p.id
LEFT JOIN studio_event_types et ON e.event_type_id = et.id
LEFT JOIN studio_contacts c ON e.contact_id = c.id
WHERE e.status = 'ACTIVE'
  AND p.event_date IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 
      FROM studio_agenda a 
      WHERE a.evento_id = e.id 
        AND a.contexto = 'evento'
  );

-- =============================================================================
-- 4. VERIFICACIÓN Y REPORTE
-- =============================================================================

-- Contar agendas actualizadas
SELECT 
    'Agendas actualizadas' as tipo,
    COUNT(*) as total
FROM studio_agenda
WHERE metadata IS NOT NULL;

-- Contar agendas sin metadata (deberían ser 0 después de la migración)
SELECT 
    'Agendas sin metadata' as tipo,
    COUNT(*) as total
FROM studio_agenda
WHERE metadata IS NULL;

-- Distribución por tipo de agenda
SELECT 
    (metadata->>'agenda_type') as tipo_agenda,
    COUNT(*) as total
FROM studio_agenda
WHERE metadata IS NOT NULL
GROUP BY (metadata->>'agenda_type')
ORDER BY total DESC;
