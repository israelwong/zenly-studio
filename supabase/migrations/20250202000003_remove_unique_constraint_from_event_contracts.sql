-- ============================================
-- Remover constraint único de event_id en studio_event_contracts
-- ============================================
-- Permite tener múltiples contratos por evento (para mantener historial de contratos cancelados)
-- y generar nuevos contratos cuando hay uno cancelado

-- Remover el constraint único si existe
DO $$
DECLARE
  constraint_name TEXT;
BEGIN
  -- Buscar el nombre del constraint único en event_id
  SELECT conname INTO constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.studio_event_contracts'::regclass
    AND contype = 'u'
    AND conkey::int[] = (
      SELECT array_agg(attnum::int)
      FROM pg_attribute
      WHERE attrelid = 'public.studio_event_contracts'::regclass
        AND attname = 'event_id'
    );

  IF constraint_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE "public"."studio_event_contracts" DROP CONSTRAINT ' || quote_ident(constraint_name);
    RAISE NOTICE 'Constraint único eliminado: %', constraint_name;
  ELSE
    RAISE NOTICE 'No se encontró constraint único en event_id';
  END IF;
END $$;

-- Agregar índice compuesto para mejorar búsquedas por event_id y status
CREATE INDEX IF NOT EXISTS "studio_event_contracts_event_id_status_idx" 
  ON "public"."studio_event_contracts"("event_id", "status");

