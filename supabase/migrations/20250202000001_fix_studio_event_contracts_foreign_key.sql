-- ============================================
-- CORREGIR: Foreign key de studio_event_contracts.event_id
-- ============================================
-- El problema es que Prisma está buscando studio_events cuando la tabla real es studio_eventos
-- Necesitamos verificar y corregir la foreign key para que apunte a studio_eventos

-- Verificar si existe la foreign key y si apunta a la tabla correcta
DO $$
DECLARE
  fk_name TEXT;
  fk_ref_table TEXT;
BEGIN
  -- Buscar la foreign key de event_id en studio_event_contracts
  SELECT 
    tc.constraint_name,
    ccu.table_name AS foreign_table_name
  INTO fk_name, fk_ref_table
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'studio_event_contracts'
    AND kcu.column_name = 'event_id'
    AND tc.table_schema = 'public'
  LIMIT 1;

  -- Si la foreign key existe pero apunta a studio_events (incorrecto)
  IF fk_name IS NOT NULL AND fk_ref_table = 'studio_events' THEN
    -- Eliminar la foreign key incorrecta
    EXECUTE format('ALTER TABLE public.studio_event_contracts DROP CONSTRAINT IF EXISTS %I', fk_name);
    RAISE NOTICE 'Foreign key % eliminada (apuntaba a studio_events)', fk_name;
  END IF;

  -- Crear/verificar que la foreign key apunte a studio_eventos (correcto)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'studio_event_contracts_event_id_fkey'
    AND conrelid = 'public.studio_event_contracts'::regclass
  ) THEN
    ALTER TABLE public.studio_event_contracts
    ADD CONSTRAINT studio_event_contracts_event_id_fkey
    FOREIGN KEY (event_id)
    REFERENCES public.studio_eventos(id)
    ON DELETE CASCADE
    ON UPDATE CASCADE;
    RAISE NOTICE 'Foreign key studio_event_contracts_event_id_fkey creada apuntando a studio_eventos';
  ELSE
    -- Verificar que la foreign key existente apunta a studio_eventos
    SELECT ccu.table_name INTO fk_ref_table
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_name = 'studio_event_contracts_event_id_fkey'
      AND tc.table_schema = 'public'
      AND tc.table_name = 'studio_event_contracts'
    LIMIT 1;

    IF fk_ref_table != 'studio_eventos' THEN
      -- Eliminar y recrear con el nombre correcto
      ALTER TABLE public.studio_event_contracts
      DROP CONSTRAINT IF EXISTS studio_event_contracts_event_id_fkey;
      
      ALTER TABLE public.studio_event_contracts
      ADD CONSTRAINT studio_event_contracts_event_id_fkey
      FOREIGN KEY (event_id)
      REFERENCES public.studio_eventos(id)
      ON DELETE CASCADE
      ON UPDATE CASCADE;
      RAISE NOTICE 'Foreign key corregida para apuntar a studio_eventos';
    ELSE
      RAISE NOTICE 'Foreign key ya apunta correctamente a studio_eventos';
    END IF;
  END IF;
END $$;

