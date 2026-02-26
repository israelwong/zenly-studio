-- =============================================================================
-- Eliminar condición pactada "Clientes especiales" (legacy / refactor)
-- Tabla: studio_condiciones_comerciales_negociacion (1 fila por cotización)
-- Ejecutar en Supabase SQL Editor.
-- =============================================================================

-- 1) LISTAR: Ver qué filas existen con nombre "Clientes especiales"
SELECT
  id,
  cotizacion_id,
  promise_id,
  studio_id,
  name,
  advance_type,
  advance_amount,
  is_temporary,
  created_at
FROM studio_condiciones_comerciales_negociacion
WHERE name = 'Clientes especiales';

-- 2) OPCIONAL: Listar TODAS las condiciones pactadas (para ver si hay más legacy)
-- SELECT id, cotizacion_id, name, advance_type, advance_amount, created_at
-- FROM studio_condiciones_comerciales_negociacion
-- ORDER BY created_at DESC;

-- 3) BORRAR solo las que se llaman "Clientes especiales"
DELETE FROM studio_condiciones_comerciales_negociacion
WHERE name = 'Clientes especiales';

-- 4) Si quieres borrar por studio (reemplaza 'TU_STUDIO_ID' por el id real):
-- DELETE FROM studio_condiciones_comerciales_negociacion
-- WHERE name = 'Clientes especiales'
--   AND studio_id = 'TU_STUDIO_ID';
