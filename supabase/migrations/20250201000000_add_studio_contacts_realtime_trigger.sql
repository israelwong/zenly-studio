-- ============================================
-- STUDIO CONTACTS: Agregar trigger de realtime
-- ============================================
-- Trigger para emitir eventos cuando se actualizan datos de contacto
-- Usa realtime.send para permitir canales públicos y evitar problemas de auth.uid() NULL
-- Útil para actualizar contratos en tiempo real cuando cambian datos del cliente

-- Crear función del trigger
CREATE OR REPLACE FUNCTION studio_contacts_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  -- Obtener studio_slug desde studio_id
  SELECT slug INTO studio_slug
  FROM public.studios
  WHERE id = COALESCE(NEW.studio_id, OLD.studio_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_contacts',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':contacts',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Comentario
COMMENT ON FUNCTION studio_contacts_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send cuando cambia un contacto. Útil para actualizar contratos en tiempo real cuando el cliente actualiza sus datos.';

-- Crear trigger solo si la tabla existe
DO $$
BEGIN
  -- Verificar si la tabla existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'studio_contacts'
  ) THEN
    -- Asegurar que el trigger existe
    DROP TRIGGER IF EXISTS studio_contacts_realtime_trigger ON studio_contacts;
    CREATE TRIGGER studio_contacts_realtime_trigger
      AFTER INSERT OR UPDATE OR DELETE ON studio_contacts
      FOR EACH ROW EXECUTE FUNCTION studio_contacts_broadcast_trigger();
    RAISE NOTICE 'Trigger studio_contacts_realtime_trigger creado/actualizado en studio_contacts.';
  ELSE
    RAISE NOTICE 'Tabla studio_contacts no existe. El trigger no se creará. Ejecuta las migraciones de Prisma primero.';
  END IF;
END $$;

