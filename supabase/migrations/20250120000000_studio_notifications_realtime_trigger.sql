-- Trigger para broadcast automático de cambios en studio_notifications
-- Este trigger emite eventos Realtime cuando se crean, actualizan o eliminan notificaciones

CREATE OR REPLACE FUNCTION studio_notifications_broadcast_trigger()
RETURNS TRIGGER AS $$
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  studio_slug TEXT;
BEGIN
  -- Obtener slug del studio
  SELECT slug INTO studio_slug
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Broadcast al canal del studio usando realtime.broadcast_changes
  -- Esto emitirá eventos INSERT, UPDATE, DELETE automáticamente
  -- La firma es: (topic, op, op, table_name, schema_name, new_record, old_record)
  PERFORM realtime.broadcast_changes(
    'studio:' || studio_slug || ':notifications',
    TG_OP,
    TG_OP,
    'studio_notifications',
    'public',
    NEW,
    OLD
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger que se ejecuta después de INSERT, UPDATE o DELETE
CREATE TRIGGER studio_notifications_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_notifications
  FOR EACH ROW EXECUTE FUNCTION studio_notifications_broadcast_trigger();

-- Comentario explicativo
COMMENT ON FUNCTION studio_notifications_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime cuando se crean, actualizan o eliminan notificaciones del estudio';

