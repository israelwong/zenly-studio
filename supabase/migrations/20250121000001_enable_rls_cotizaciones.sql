-- ============================================
-- HABILITAR RLS EN STUDIO_COTIZACIONES
-- ============================================
-- Asegurar que RLS esté habilitado y políticas básicas existan

-- Habilitar RLS si no está habilitado
ALTER TABLE studio_cotizaciones ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden leer cotizaciones de su studio
DROP POLICY IF EXISTS "studio_cotizaciones_read_studio" ON studio_cotizaciones;
CREATE POLICY "studio_cotizaciones_read_studio" ON studio_cotizaciones
FOR SELECT TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden crear cotizaciones en su studio
DROP POLICY IF EXISTS "studio_cotizaciones_insert_studio" ON studio_cotizaciones;
CREATE POLICY "studio_cotizaciones_insert_studio" ON studio_cotizaciones
FOR INSERT TO authenticated
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden actualizar cotizaciones de su studio
DROP POLICY IF EXISTS "studio_cotizaciones_update_studio" ON studio_cotizaciones;
CREATE POLICY "studio_cotizaciones_update_studio" ON studio_cotizaciones
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

-- Política: Usuarios pueden eliminar cotizaciones de su studio
DROP POLICY IF EXISTS "studio_cotizaciones_delete_studio" ON studio_cotizaciones;
CREATE POLICY "studio_cotizaciones_delete_studio" ON studio_cotizaciones
FOR DELETE TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Comentario
COMMENT ON TABLE studio_cotizaciones IS 
  'Cotizaciones con RLS habilitado - usuarios solo pueden acceder a cotizaciones de su studio';
