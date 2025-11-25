-- Migración: Promesa como Fuente Única de Verdad
-- Fecha: 2025-01-XX
-- Descripción: Migra datos de studio_events a studio_promises y elimina campos duplicados

BEGIN;

-- ============================================
-- PASO 1: Agregar campos a studio_promises
-- ============================================

-- Agregar address si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'studio_promises' AND column_name = 'address'
    ) THEN
        ALTER TABLE studio_promises ADD COLUMN address TEXT;
    END IF;
END $$;

-- Agregar event_date si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'studio_promises' AND column_name = 'event_date'
    ) THEN
        ALTER TABLE studio_promises ADD COLUMN event_date TIMESTAMP;
    END IF;
END $$;

-- ============================================
-- PASO 2: Migrar datos de studio_events a studio_promises
-- ============================================

-- Migrar address desde evento a promesa
UPDATE studio_promises p
SET address = e.address
FROM studio_events e
WHERE p.id = e.promise_id
  AND e.address IS NOT NULL
  AND p.address IS NULL;

-- Migrar event_date desde evento a promesa (usar event_date del evento si no hay defined_date)
UPDATE studio_promises p
SET event_date = COALESCE(p.defined_date, e.event_date)
FROM studio_events e
WHERE p.id = e.promise_id
  AND e.event_date IS NOT NULL
  AND p.event_date IS NULL;

-- Migrar name desde evento a promesa si no existe en promesa
UPDATE studio_promises p
SET name = COALESCE(p.name, e.name)
FROM studio_events e
WHERE p.id = e.promise_id
  AND e.name IS NOT NULL
  AND (p.name IS NULL OR p.name = 'Pendiente');

-- ============================================
-- PASO 3: Migrar pagos de studio_event_payments a studio_pagos
-- ============================================

-- Migrar pagos de eventos a studio_pagos asociándolos a la cotización del evento
INSERT INTO studio_pagos (
    id,
    promise_id,
    cotizacion_id,
    contact_id,
    amount,
    metodo_pago,
    status,
    payment_date,
    concept,
    created_at,
    updated_at,
    transaction_category,
    transaction_type
)
SELECT 
    ep.id,
    e.promise_id,
    e.cotizacion_id, -- Asociar a la cotización principal del evento
    e.contact_id,
    ep.amount::FLOAT,
    ep.payment_method,
    'paid', -- Asumir que los pagos existentes están pagados
    ep.payment_date,
    COALESCE(ep.concept, 'Pago del evento'),
    ep.created_at,
    NOW(),
    'abono',
    'ingreso'
FROM studio_event_payments ep
JOIN studio_events e ON ep.event_id = e.id
WHERE e.promise_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM studio_pagos p 
    WHERE p.id = ep.id
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASO 4: Hacer promise_id requerido en studio_events
-- ============================================

-- Primero, eliminar eventos sin promesa (si los hay)
-- NOTA: Esto es destructivo, revisar antes de ejecutar
-- DELETE FROM studio_events WHERE promise_id IS NULL;

-- Luego hacer la columna requerida (comentado hasta que se eliminen eventos sin promesa)
-- ALTER TABLE studio_events ALTER COLUMN promise_id SET NOT NULL;

-- ============================================
-- PASO 5: Eliminar campos de studio_events
-- ============================================

-- Eliminar address
ALTER TABLE studio_events DROP COLUMN IF EXISTS address;

-- Eliminar sede (consolidado en event_location de promesa)
ALTER TABLE studio_events DROP COLUMN IF EXISTS sede;

-- Eliminar name (leer de promise.name)
ALTER TABLE studio_events DROP COLUMN IF EXISTS name;

-- Eliminar campos financieros calculados
ALTER TABLE studio_events DROP COLUMN IF EXISTS contract_value;
ALTER TABLE studio_events DROP COLUMN IF EXISTS paid_amount;
ALTER TABLE studio_events DROP COLUMN IF EXISTS pending_amount;

-- ============================================
-- PASO 6: Eliminar tabla studio_event_payments
-- ============================================

-- Eliminar índices primero
DROP INDEX IF EXISTS studio_event_payments_event_id_payment_date_idx;

-- Eliminar tabla
DROP TABLE IF EXISTS studio_event_payments;

-- ============================================
-- PASO 7: Agregar índices en studio_promises
-- ============================================

CREATE INDEX IF NOT EXISTS studio_promises_event_date_idx ON studio_promises(event_date);

COMMIT;

-- ============================================
-- VERIFICACIONES POST-MIGRACIÓN
-- ============================================

-- Verificar que todos los eventos tienen promesa
-- SELECT COUNT(*) as eventos_sin_promesa 
-- FROM studio_events 
-- WHERE promise_id IS NULL;

-- Verificar migración de pagos
-- SELECT COUNT(*) as pagos_migrados
-- FROM studio_pagos
-- WHERE promise_id IS NOT NULL;

-- Verificar migración de address
-- SELECT COUNT(*) as promesas_con_address
-- FROM studio_promises
-- WHERE address IS NOT NULL;

