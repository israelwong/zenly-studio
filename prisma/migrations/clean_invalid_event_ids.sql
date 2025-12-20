-- Script para limpiar evento_id inválidos en studio_cotizaciones
-- Ejecutar antes de prisma db push

-- Usar el nombre correcto de la tabla (puede ser studio_eventos o studio_events)
DO $$ 
DECLARE
    event_table_name TEXT;
BEGIN
    -- Determinar qué tabla existe
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_events') THEN
        event_table_name := 'studio_events';
    ELSIF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'studio_eventos') THEN
        event_table_name := 'studio_eventos';
    ELSE
        RAISE NOTICE 'No se encontró tabla de eventos';
        RETURN;
    END IF;
    
    -- Hacer NULL los evento_id que no existen en la tabla de eventos
    EXECUTE format('
        UPDATE studio_cotizaciones
        SET evento_id = NULL
        WHERE evento_id IS NOT NULL 
        AND evento_id NOT IN (SELECT id FROM %I)', event_table_name);
    
    RAISE NOTICE 'Limpieza completada usando tabla: %', event_table_name;
END $$;

