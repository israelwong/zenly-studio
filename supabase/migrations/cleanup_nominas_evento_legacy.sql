-- ============================================
-- Limpiar nóminas pendientes de evento legacy
-- Evento ID: cmjdg1tyk001miygu4b76lxvc
-- ============================================
-- 
-- NOTA: Las relaciones studio_nomina_servicios y studio_nomina_pagos_parciales
-- tienen onDelete: Cascade, por lo que se eliminarán automáticamente al eliminar
-- las nóminas. Sin embargo, incluimos los DELETE explícitos por seguridad.

BEGIN;

-- Paso 1: Verificar cuántas nóminas se van a eliminar
SELECT 
  COUNT(*) as total_nominas,
  STRING_AGG(id, ', ') as nomina_ids
FROM public.studio_nominas 
WHERE evento_id = 'cmjdg1tyk001miygu4b76lxvc' 
  AND status = 'pendiente';

-- Paso 2: Eliminar servicios de nómina asociados (aunque tienen cascade, lo hacemos explícito)
DELETE FROM public.studio_nomina_servicios
WHERE payroll_id IN (
  SELECT id 
  FROM public.studio_nominas 
  WHERE evento_id = 'cmjdg1tyk001miygu4b76lxvc' 
    AND status = 'pendiente'
);

-- Paso 3: Eliminar pagos parciales asociados (aunque tienen cascade, lo hacemos explícito)
DELETE FROM public.studio_nomina_pagos_parciales
WHERE nomina_id IN (
  SELECT id 
  FROM public.studio_nominas 
  WHERE evento_id = 'cmjdg1tyk001miygu4b76lxvc' 
    AND status = 'pendiente'
);

-- Paso 4: Eliminar las nóminas pendientes del evento
-- Esto eliminará automáticamente los servicios y pagos parciales por cascade
DELETE FROM public.studio_nominas
WHERE evento_id = 'cmjdg1tyk001miygu4b76lxvc' 
  AND status = 'pendiente';

-- Paso 5: Verificar que se eliminaron (debería retornar 0 filas)
SELECT COUNT(*) as nominas_restantes
FROM public.studio_nominas 
WHERE evento_id = 'cmjdg1tyk001miygu4b76lxvc' 
  AND status = 'pendiente';

COMMIT;

