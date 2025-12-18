-- ============================================
-- MIGRACIÓN COMPLETA: Usar realtime.send para todos los canales
-- ============================================
-- Solución robusta y centralizada que evita problemas de auth.uid() NULL
-- realtime.send permite usar canales públicos, evitando políticas RLS complejas

-- ============================================
-- PROMISES: Migrar a realtime.send
-- ============================================
CREATE OR REPLACE FUNCTION studio_promises_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  SELECT slug INTO studio_slug
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_promises',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':promises',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar que el trigger existe
DROP TRIGGER IF EXISTS studio_promises_realtime_trigger ON studio_promises;
CREATE TRIGGER studio_promises_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_promises
  FOR EACH ROW EXECUTE FUNCTION studio_promises_broadcast_trigger();

-- ============================================
-- NOTIFICACIONES: Migrar a realtime.send
-- ============================================
CREATE OR REPLACE FUNCTION studio_notifications_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  SELECT slug INTO studio_slug
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_notifications',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':notifications',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar que el trigger existe
DROP TRIGGER IF EXISTS studio_notifications_realtime_trigger ON studio_notifications;
CREATE TRIGGER studio_notifications_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_notifications
  FOR EACH ROW EXECUTE FUNCTION studio_notifications_broadcast_trigger();

-- ============================================
-- COTIZACIONES: Migrar a realtime.send
-- ============================================
CREATE OR REPLACE FUNCTION studio_cotizaciones_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  SELECT slug INTO studio_slug
  FROM studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_cotizaciones',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':cotizaciones',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Asegurar que el trigger existe
DROP TRIGGER IF EXISTS studio_cotizaciones_realtime_trigger ON studio_cotizaciones;
CREATE TRIGGER studio_cotizaciones_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_cotizaciones
  FOR EACH ROW EXECUTE FUNCTION studio_cotizaciones_broadcast_trigger();

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON FUNCTION studio_promises_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send. Solución robusta que evita problemas de auth.uid() NULL.';

COMMENT ON FUNCTION studio_notifications_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send. Solución robusta que evita problemas de auth.uid() NULL.';

COMMENT ON FUNCTION studio_cotizaciones_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send. Solución robusta que permite acceso anónimo para promises públicos.';
