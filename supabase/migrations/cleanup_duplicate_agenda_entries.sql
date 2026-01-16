-- Migración: Limpiar entradas duplicadas en studio_agenda y normalizar fechas
-- Fecha: Enero 2026
-- Objetivo: Eliminar duplicados de agenda para el mismo evento_id y normalizar fechas a UTC

-- ============================================================================
-- PASO 1: Ver qué duplicados existen (EJECUTAR PRIMERO PARA REVISAR)
-- ============================================================================
-- Descomentar y ejecutar primero para ver qué se va a eliminar:
/*
SELECT 
  evento_id,
  DATE(date) as fecha_normalizada,
  COUNT(*) as cantidad,
  array_agg(id ORDER BY created_at DESC NULLS LAST, id DESC) as ids,
  array_agg(created_at ORDER BY created_at DESC NULLS LAST) as fechas_creacion
FROM studio_agenda
WHERE 
  evento_id IS NOT NULL 
  AND contexto = 'evento'
GROUP BY evento_id, DATE(date)
HAVING COUNT(*) > 1
ORDER BY evento_id, fecha_normalizada;
*/

-- ============================================================================
-- PASO 2: Eliminar duplicados manteniendo solo el más reciente
-- ============================================================================
-- Mantener solo la entrada más reciente para cada combinación de evento_id + fecha (normalizada)
WITH ranked_agendas AS (
  SELECT 
    id,
    evento_id,
    date,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY 
        evento_id,
        -- Normalizar fecha a solo día (sin hora) para comparación
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
-- PASO 3: Normalizar fechas existentes en studio_agenda para eventos
-- ============================================================================
-- La columna date es de tipo TIMESTAMP, normalizar a mediodía UTC (12:00:00)
-- Extraer solo la parte de fecha (año, mes, día) y establecer hora a 12:00:00 UTC
-- Esto asegura que todas las fechas estén en 12:00:00 UTC para evitar problemas de zona horaria
UPDATE studio_agenda
SET date = (
  DATE_TRUNC('day', date AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'
) + INTERVAL '12 hours'
WHERE 
  evento_id IS NOT NULL 
  AND contexto = 'evento'
  AND date IS NOT NULL;

-- ============================================================================
-- PASO 4: Verificar que no queden duplicados después de la limpieza
-- ============================================================================
-- Esta consulta debería retornar 0 filas si todo está correcto
-- Descomentar para verificar:
/*
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
*/
