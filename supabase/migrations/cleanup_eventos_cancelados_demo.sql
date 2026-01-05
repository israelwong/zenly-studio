-- ============================================
-- Limpiar eventos cancelados del studio de demo
-- Studio ID: demo-studio-id
-- ============================================
-- 
-- Este script elimina TODOS los eventos cancelados y sus datos relacionados
-- del studio de demo. Solo ejecutar en desarrollo/testing.
--
-- ADVERTENCIA: Esta operación es IRREVERSIBLE
-- ============================================

BEGIN;

-- Paso 1: Identificar eventos cancelados a eliminar
DO $$
DECLARE
  evento_ids TEXT[];
  evento_count INT;
BEGIN
  -- Obtener IDs de eventos cancelados del studio demo
  SELECT ARRAY_AGG(id::TEXT), COUNT(*)
  INTO evento_ids, evento_count
  FROM public.studio_eventos
  WHERE studio_id = 'demo-studio-id'
    AND status = 'CANCELLED';
  
  RAISE NOTICE 'Eventos cancelados encontrados: %', evento_count;
  RAISE NOTICE 'IDs: %', array_to_string(evento_ids, ', ');
  
  IF evento_count = 0 THEN
    RAISE NOTICE 'No hay eventos cancelados para eliminar';
    RETURN;
  END IF;

  -- Paso 2: Eliminar servicios de nómina asociados
  DELETE FROM public.studio_nomina_servicios
  WHERE payroll_id IN (
    SELECT id FROM public.studio_nominas
    WHERE evento_id = ANY(evento_ids)
  );
  RAISE NOTICE 'Servicios de nómina eliminados';

  -- Paso 3: Eliminar pagos parciales de nóminas
  DELETE FROM public.studio_nomina_pagos_parciales
  WHERE nomina_id IN (
    SELECT id FROM public.studio_nominas
    WHERE evento_id = ANY(evento_ids)
  );
  RAISE NOTICE 'Pagos parciales eliminados';

  -- Paso 4: Eliminar nóminas asociadas a eventos cancelados
  DELETE FROM public.studio_nominas
  WHERE evento_id = ANY(evento_ids);
  RAISE NOTICE 'Nóminas eliminadas';

  -- Paso 5: Eliminar entregables de eventos
  DELETE FROM public.studio_event_deliverables
  WHERE event_id = ANY(evento_ids);
  RAISE NOTICE 'Entregables eliminados';

  -- Paso 6: Eliminar tareas de eventos
  DELETE FROM public.studio_event_tasks
  WHERE event_id = ANY(evento_ids);
  RAISE NOTICE 'Tareas eliminadas';

  -- Paso 7: Eliminar timeline de eventos
  DELETE FROM public.studio_event_timeline
  WHERE event_id = ANY(evento_ids);
  RAISE NOTICE 'Timeline eliminado';

  -- Paso 8: Eliminar contratos de eventos
  DELETE FROM public.studio_event_contracts
  WHERE event_id = ANY(evento_ids);
  RAISE NOTICE 'Contratos eliminados';

  -- Paso 9: Eliminar agendamientos asociados
  DELETE FROM public.studio_agenda
  WHERE evento_id = ANY(evento_ids);
  RAISE NOTICE 'Agendamientos eliminados';

  -- Paso 10: Eliminar notificaciones de cliente asociadas
  DELETE FROM public.studio_client_notifications
  WHERE event_id = ANY(evento_ids);
  RAISE NOTICE 'Notificaciones de cliente eliminadas';

  -- Paso 11: Eliminar accesos de portal de cliente asociados
  DELETE FROM public.studio_client_portal_access
  WHERE event_id = ANY(evento_ids);
  RAISE NOTICE 'Accesos de portal eliminados';

  -- Paso 12: Actualizar cotizaciones para liberar relación con eventos cancelados
  UPDATE public.studio_cotizaciones
  SET evento_id = NULL,
      updated_at = NOW()
  WHERE evento_id = ANY(evento_ids);
  RAISE NOTICE 'Cotizaciones actualizadas (relación liberada)';

  -- Paso 13: Eliminar registros de cierre de cotizaciones asociadas
  DELETE FROM public.studio_cotizaciones_cierre
  WHERE cotizacion_id IN (
    SELECT id FROM public.studio_cotizaciones
    WHERE evento_id = ANY(evento_ids)
  );
  RAISE NOTICE 'Registros de cierre eliminados';

  -- Paso 14: Eliminar eventos cancelados
  DELETE FROM public.studio_eventos
  WHERE id = ANY(evento_ids);
  RAISE NOTICE 'Eventos cancelados eliminados: %', evento_count;

END $$;

-- Verificar que se eliminaron correctamente
SELECT 
  COUNT(*) as eventos_cancelados_restantes,
  STRING_AGG(id::TEXT, ', ') as ids_restantes
FROM public.studio_eventos
WHERE studio_id = 'demo-studio-id'
  AND status = 'CANCELLED';

COMMIT;

-- Resumen final
SELECT 
  'Limpieza completada' as resultado,
  COUNT(*) FILTER (WHERE status = 'CANCELLED') as eventos_cancelados_restantes,
  COUNT(*) FILTER (WHERE status = 'ACTIVE') as eventos_activos
FROM public.studio_eventos
WHERE studio_id = 'demo-studio-id';
