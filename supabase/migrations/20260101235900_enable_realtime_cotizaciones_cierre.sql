-- ============================================
-- STUDIO COTIZACIONES CIERRE: Agregar trigger de realtime
-- ============================================
-- Trigger para emitir eventos cuando se crean, actualizan o eliminan registros de cierre
-- Usa realtime.send para permitir canales públicos y evitar problemas de auth.uid() NULL

-- Crear función del trigger
CREATE OR REPLACE FUNCTION studio_cotizaciones_cierre_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  -- Obtener studio_slug desde cotizacion_id -> studio_id
  SELECT s.slug INTO studio_slug
  FROM public.studios s
  INNER JOIN public.studio_cotizaciones c ON c.studio_id = s.id
  WHERE c.id = COALESCE(NEW.cotizacion_id, OLD.cotizacion_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_cotizaciones_cierre',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':cotizaciones',  -- topic TEXT (tercero) - mismo canal que cotizaciones
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Comentario
COMMENT ON FUNCTION studio_cotizaciones_cierre_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send cuando cambia un registro de cierre. Usa el mismo canal que cotizaciones para sincronización.';

-- Crear trigger solo si la tabla existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'studio_cotizaciones_cierre'
  ) THEN
    -- Habilitar Realtime en la tabla
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'studio_cotizaciones_cierre'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE studio_cotizaciones_cierre;
    END IF;
    
    -- Asegurar que el trigger existe
    DROP TRIGGER IF EXISTS studio_cotizaciones_cierre_realtime_trigger ON studio_cotizaciones_cierre;
    CREATE TRIGGER studio_cotizaciones_cierre_realtime_trigger
      AFTER INSERT OR UPDATE OR DELETE ON studio_cotizaciones_cierre
      FOR EACH ROW EXECUTE FUNCTION studio_cotizaciones_cierre_broadcast_trigger();
  ELSE
    RAISE NOTICE 'Tabla studio_cotizaciones_cierre no existe. El trigger no se creará.';
  END IF;
END $$;

