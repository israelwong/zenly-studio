-- Sincronizar tentative_dates a event_date para promesas con una sola fecha
-- Este script corrige promesas que tienen una fecha en tentative_dates pero no en event_date

-- 1. Actualizar promesas que tienen exactamente una fecha en tentative_dates pero event_date es NULL
UPDATE studio_promises
SET 
    event_date = (tentative_dates->>0)::date,
    updated_at = NOW()
WHERE 
    tentative_dates IS NOT NULL
    AND jsonb_array_length(tentative_dates::jsonb) = 1
    AND event_date IS NULL
    AND (tentative_dates->>0) IS NOT NULL
    AND (tentative_dates->>0) != '';

-- 2. Limpiar event_date para promesas que tienen múltiples fechas en tentative_dates
UPDATE studio_promises
SET 
    event_date = NULL,
    updated_at = NOW()
WHERE 
    tentative_dates IS NOT NULL
    AND jsonb_array_length(tentative_dates::jsonb) > 1
    AND event_date IS NOT NULL;

-- 3. Reporte de cambios
DO $$
DECLARE
    single_date_count INTEGER;
    multi_date_count INTEGER;
BEGIN
    -- Contar promesas con una sola fecha sincronizada
    SELECT COUNT(*) INTO single_date_count
    FROM studio_promises
    WHERE 
        tentative_dates IS NOT NULL
        AND jsonb_array_length(tentative_dates::jsonb) = 1
        AND event_date IS NOT NULL;
    
    -- Contar promesas con múltiples fechas (sin event_date)
    SELECT COUNT(*) INTO multi_date_count
    FROM studio_promises
    WHERE 
        tentative_dates IS NOT NULL
        AND jsonb_array_length(tentative_dates::jsonb) > 1
        AND event_date IS NULL;
    
    RAISE NOTICE 'Sincronización completada:';
    RAISE NOTICE '- Promesas con una fecha sincronizada: %', single_date_count;
    RAISE NOTICE '- Promesas con múltiples fechas (sin event_date): %', multi_date_count;
END $$;
