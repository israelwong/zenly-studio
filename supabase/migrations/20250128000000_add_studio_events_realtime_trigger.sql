-- ============================================
-- STUDIO EVENTOS: Agregar trigger de realtime
-- ============================================
-- Trigger para emitir eventos cuando se crean, actualizan o eliminan eventos
-- Usa realtime.send para permitir canales públicos y evitar problemas de auth.uid() NULL
-- Especialmente útil para actualizar el estado del pipeline en tiempo real
-- 
-- NOTA: La tabla en la BD se llama studio_eventos (no studio_events)

-- Crear función del trigger (siempre se crea, incluso si la tabla no existe aún)
CREATE OR REPLACE FUNCTION studio_events_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  -- Obtener studio_slug desde promise_id -> studio_id
  SELECT s.slug INTO studio_slug
  FROM public.studios s
  INNER JOIN public.studio_promises p ON p.studio_id = s.id
  WHERE p.id = COALESCE(NEW.promise_id, OLD.promise_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_eventos',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':events',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Comentario
COMMENT ON FUNCTION studio_events_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send cuando cambia un evento. Útil para actualizar el estado del pipeline en tiempo real en el portal del cliente.';

-- Crear trigger solo si la tabla existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'studio_eventos'
  ) THEN
    -- Habilitar Realtime en la tabla (opcional, ya que usamos realtime.send)
    -- Esto permite escuchar cambios directamente en la tabla si se necesita
    -- Verificar si la tabla ya está en la publicación antes de agregarla
    IF NOT EXISTS (
      SELECT 1 
      FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'studio_eventos'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE studio_eventos;
    END IF;
    
    -- Asegurar que el trigger existe
    DROP TRIGGER IF EXISTS studio_events_realtime_trigger ON studio_eventos;
    CREATE TRIGGER studio_events_realtime_trigger
      AFTER INSERT OR UPDATE OR DELETE ON studio_eventos
      FOR EACH ROW EXECUTE FUNCTION studio_events_broadcast_trigger();
  ELSE
    RAISE NOTICE 'Tabla studio_eventos no existe. El trigger no se creará. Ejecuta las migraciones de Prisma primero.';
  END IF;
END $$;

