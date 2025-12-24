-- ============================================
-- STUDIO EVENT CONTRACTS: Agregar trigger de realtime
-- ============================================
-- Trigger para emitir eventos cuando se crean, actualizan o eliminan contratos
-- Usa realtime.send para permitir canales públicos y evitar problemas de auth.uid() NULL
-- Especialmente útil para actualizar el componente EventContractCard en tiempo real
-- cuando se regenera automáticamente el contrato

-- Crear función del trigger (siempre se crea, incluso si la tabla no existe aún)
CREATE OR REPLACE FUNCTION studio_event_contracts_broadcast_trigger()
RETURNS TRIGGER AS $$
DECLARE
  studio_slug TEXT;
  payload JSONB;
BEGIN
  -- Obtener studio_slug desde event_id -> studio_id
  -- NOTA: La tabla se llama studio_eventos en la BD (no studio_events)
  SELECT s.slug INTO studio_slug
  FROM public.studios s
  INNER JOIN public.studio_eventos e ON e.studio_id = s.id
  WHERE e.id = COALESCE(NEW.event_id, OLD.event_id);
  
  IF studio_slug IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Payload compatible con formato de broadcast_changes
  payload := jsonb_build_object(
    'operation', TG_OP,
    'table', 'studio_event_contracts',
    'new', CASE WHEN TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN row_to_json(NEW) ELSE NULL END,
    'old', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    'record', row_to_json(COALESCE(NEW, OLD)),
    'old_record', CASE WHEN TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END
  );
  
  PERFORM realtime.send(
    payload,  -- payload JSONB (primero)
    TG_OP,    -- event TEXT (segundo)
    'studio:' || studio_slug || ':contracts',  -- topic TEXT (tercero)
    false     -- is_private BOOLEAN (cuarto) - Canal público
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Comentario
COMMENT ON FUNCTION studio_event_contracts_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send cuando cambia un contrato. Útil para actualizar EventContractCard en tiempo real cuando se regenera automáticamente el contrato.';

-- Crear trigger y añadir a la publicación solo si la tabla existe
DO $$
BEGIN
  -- Verificar si la tabla existe
  IF EXISTS (
    SELECT 1 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'studio_event_contracts'
  ) THEN
    -- Verificar si la tabla ya está en la publicación
    IF NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND tablename = 'studio_event_contracts'
    ) THEN
      -- Añadir la tabla a la publicación de Realtime
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE studio_event_contracts;';
      RAISE NOTICE 'Tabla studio_event_contracts añadida a la publicación supabase_realtime.';
    ELSE
      RAISE NOTICE 'Tabla studio_event_contracts ya está en la publicación supabase_realtime.';
    END IF;

    -- Asegurar que el trigger existe
    DROP TRIGGER IF EXISTS studio_event_contracts_realtime_trigger ON studio_event_contracts;
    CREATE TRIGGER studio_event_contracts_realtime_trigger
      AFTER INSERT OR UPDATE OR DELETE ON studio_event_contracts
      FOR EACH ROW EXECUTE FUNCTION studio_event_contracts_broadcast_trigger();
    RAISE NOTICE 'Trigger studio_event_contracts_realtime_trigger creado/actualizado en studio_event_contracts.';
  ELSE
    RAISE NOTICE 'Tabla studio_event_contracts no existe. El trigger y la adición a la publicación no se realizarán. Ejecuta las migraciones de Prisma primero.';
  END IF;
END $$;

