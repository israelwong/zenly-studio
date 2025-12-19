-- ============================================
-- LOGS DE PROMESAS: Agregar trigger de realtime
-- ============================================
-- Trigger para emitir eventos cuando se crean, actualizan o eliminan logs de promesas
-- Usa realtime.send para permitir canales públicos y evitar problemas de auth.uid() NULL

CREATE OR REPLACE FUNCTION studio_promise_logs_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  -- Obtener studio_slug desde promise_id
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
    'table', 'studio_promise_logs',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':promise-logs',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Asegurar que el trigger existe
DROP TRIGGER IF EXISTS studio_promise_logs_realtime_trigger ON studio_promise_logs;
CREATE TRIGGER studio_promise_logs_realtime_trigger
  AFTER INSERT OR UPDATE OR DELETE ON studio_promise_logs
  FOR EACH ROW EXECUTE FUNCTION studio_promise_logs_broadcast_trigger();

-- Comentario
COMMENT ON FUNCTION studio_promise_logs_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send para logs de promesas. Solución robusta que permite acceso anónimo.';
