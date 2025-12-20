-- Query para eliminar todas las cotizaciones de demo-studio en cascada
-- 
-- IMPORTANTE: Esta query elimina permanentemente todas las cotizaciones y sus relaciones.
-- Las siguientes tablas se eliminan automáticamente por CASCADE:
--   - studio_cotizacion_items (onDelete: Cascade)
--   - studio_cotizacion_costos (onDelete: Cascade)
--   - studio_cotizacion_visitas (onDelete: Cascade)
--
-- Para studio_pagos, se actualiza cotizacion_id a NULL (onDelete: SET NULL)

BEGIN;

-- 1. Primero, actualizar pagos para remover referencia a cotizaciones (SET NULL)
UPDATE studio_pagos
SET cotizacion_id = NULL
WHERE cotizacion_id IN (
  SELECT id 
  FROM studio_cotizaciones 
  WHERE studio_id = (SELECT id FROM studios WHERE slug = 'demo-studio')
);

-- 2. Eliminar cotizaciones (esto elimina automáticamente en cascada):
--    - studio_cotizacion_items
--    - studio_cotizacion_costos
--    - studio_cotizacion_visitas
DELETE FROM studio_cotizaciones
WHERE studio_id = (SELECT id FROM studios WHERE slug = 'demo-studio');

-- Verificar resultado
SELECT 
  COUNT(*) as cotizaciones_eliminadas,
  (SELECT COUNT(*) FROM studio_cotizacion_items WHERE cotizacion_id IN (
    SELECT id FROM studio_cotizaciones WHERE studio_id = (SELECT id FROM studios WHERE slug = 'demo-studio')
  )) as items_restantes
FROM studio_cotizaciones
WHERE studio_id = (SELECT id FROM studios WHERE slug = 'demo-studio');

COMMIT;

-- Si quieres verificar antes de ejecutar, usa esta query:
-- SELECT 
--   c.id,
--   c.name,
--   c.status,
--   COUNT(ci.id) as items_count,
--   COUNT(cv.id) as visitas_count,
--   COUNT(cc.id) as costos_count,
--   COUNT(p.id) as pagos_count
-- FROM studio_cotizaciones c
-- LEFT JOIN studio_cotizacion_items ci ON ci.cotizacion_id = c.id
-- LEFT JOIN studio_cotizacion_visitas cv ON cv.cotizacion_id = c.id
-- LEFT JOIN studio_cotizacion_costos cc ON cc.cotizacion_id = c.id
-- LEFT JOIN studio_pagos p ON p.cotizacion_id = c.id
-- WHERE c.studio_id = (SELECT id FROM studios WHERE slug = 'demo-studio')
-- GROUP BY c.id, c.name, c.status
-- ORDER BY c.created_at DESC;
