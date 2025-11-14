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

-- Políticas RLS para realtime.messages (requeridas para canales privados)
-- Permitir lectura de mensajes de broadcast para usuarios autenticados del studio
CREATE POLICY "studio_notifications_can_read_broadcasts" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

-- Permitir escritura de mensajes de broadcast (el trigger usa SECURITY DEFINER, pero esto es requerido)
CREATE POLICY "studio_notifications_can_write_broadcasts" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.email = (SELECT email FROM auth.users WHERE id = auth.uid())
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

-- Índice para mejorar rendimiento de las políticas RLS
CREATE INDEX IF NOT EXISTS idx_studio_user_profiles_email_active 
ON studio_user_profiles(email, is_active) 
WHERE is_active = true;

