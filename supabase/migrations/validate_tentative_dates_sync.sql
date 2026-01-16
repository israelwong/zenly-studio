-- Script de validación para verificar el estado de tentative_dates vs event_date
-- Ejecutar ANTES de la migración para ver qué se va a cambiar

-- 1. Promesas con una sola fecha en tentative_dates pero sin event_date (SE CORREGIRÁN)
SELECT 
    'Promesas a corregir (1 fecha en tentative_dates, sin event_date)' as categoria,
    COUNT(*) as total,
    json_agg(
        json_build_object(
            'id', id,
            'contact_id', contact_id,
            'tentative_dates', tentative_dates,
            'event_date', event_date,
            'fecha_a_asignar', (tentative_dates->>0)::date
        )
    ) FILTER (WHERE id IS NOT NULL) as ejemplos_primeros_5
FROM (
    SELECT *
    FROM studio_promises
    WHERE 
        tentative_dates IS NOT NULL
        AND jsonb_array_length(tentative_dates::jsonb) = 1
        AND event_date IS NULL
        AND (tentative_dates->>0) IS NOT NULL
        AND (tentative_dates->>0) != ''
    LIMIT 5
) sub
GROUP BY categoria

UNION ALL

-- 2. Promesas con múltiples fechas en tentative_dates y con event_date (SE LIMPIARÁ event_date)
SELECT 
    'Promesas a limpiar (múltiples fechas, event_date será NULL)' as categoria,
    COUNT(*) as total,
    json_agg(
        json_build_object(
            'id', id,
            'contact_id', contact_id,
            'tentative_dates', tentative_dates,
            'event_date_actual', event_date
        )
    ) FILTER (WHERE id IS NOT NULL) as ejemplos_primeros_5
FROM (
    SELECT *
    FROM studio_promises
    WHERE 
        tentative_dates IS NOT NULL
        AND jsonb_array_length(tentative_dates::jsonb) > 1
        AND event_date IS NOT NULL
    LIMIT 5
) sub
GROUP BY categoria

UNION ALL

-- 3. Promesas ya correctas (una fecha en ambos campos)
SELECT 
    'Promesas correctas (1 fecha sincronizada)' as categoria,
    COUNT(*) as total,
    json_agg(
        json_build_object(
            'id', id,
            'tentative_dates', tentative_dates,
            'event_date', event_date
        )
    ) FILTER (WHERE id IS NOT NULL) as ejemplos_primeros_5
FROM (
    SELECT *
    FROM studio_promises
    WHERE 
        tentative_dates IS NOT NULL
        AND jsonb_array_length(tentative_dates::jsonb) = 1
        AND event_date IS NOT NULL
    LIMIT 5
) sub
GROUP BY categoria

UNION ALL

-- 4. Promesas sin fechas
SELECT 
    'Promesas sin fechas' as categoria,
    COUNT(*) as total,
    NULL as ejemplos_primeros_5
FROM studio_promises
WHERE 
    (tentative_dates IS NULL OR jsonb_array_length(tentative_dates::jsonb) = 0)
    AND event_date IS NULL;

-- 5. Resumen general
SELECT 
    '--- RESUMEN GENERAL ---' as categoria,
    NULL::bigint as total,
    json_build_object(
        'total_promesas', (SELECT COUNT(*) FROM studio_promises),
        'con_event_date', (SELECT COUNT(*) FROM studio_promises WHERE event_date IS NOT NULL),
        'con_tentative_dates', (SELECT COUNT(*) FROM studio_promises WHERE tentative_dates IS NOT NULL),
        'sin_fechas', (SELECT COUNT(*) FROM studio_promises WHERE event_date IS NULL AND (tentative_dates IS NULL OR jsonb_array_length(tentative_dates::jsonb) = 0))
    ) as ejemplos_primeros_5;
