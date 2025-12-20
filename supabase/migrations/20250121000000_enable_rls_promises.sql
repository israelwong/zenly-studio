-- ============================================
-- HABILITAR RLS EN STUDIO_PROMISES
-- ============================================
-- Asegurar que RLS esté habilitado y políticas básicas existan

-- Habilitar RLS si no está habilitado
ALTER TABLE studio_promises ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden leer promesas de su studio
DROP POLICY IF EXISTS "studio_promises_read_studio" ON studio_promises;
CREATE POLICY "studio_promises_read_studio" ON studio_promises
FOR SELECT TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden crear promesas en su studio
DROP POLICY IF EXISTS "studio_promises_insert_studio" ON studio_promises;
CREATE POLICY "studio_promises_insert_studio" ON studio_promises
FOR INSERT TO authenticated
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden actualizar promesas de su studio
DROP POLICY IF EXISTS "studio_promises_update_studio" ON studio_promises;
CREATE POLICY "studio_promises_update_studio" ON studio_promises
FOR UPDATE TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
)
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden eliminar promesas de su studio
DROP POLICY IF EXISTS "studio_promises_delete_studio" ON studio_promises;
CREATE POLICY "studio_promises_delete_studio" ON studio_promises
FOR DELETE TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Comentario
COMMENT ON TABLE studio_promises IS 
  'Promesas con RLS habilitado - usuarios solo pueden acceder a promesas de su studio';
