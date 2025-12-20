-- ============================================
-- HABILITAR RLS EN STUDIO_COTIZACION_ITEMS
-- ============================================
-- Asegurar que RLS esté habilitado y políticas básicas existan

-- Habilitar RLS si no está habilitado
ALTER TABLE studio_cotizacion_items ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden leer items de cotizaciones de su studio
DROP POLICY IF EXISTS "studio_cotizacion_items_read_studio" ON studio_cotizacion_items;
CREATE POLICY "studio_cotizacion_items_read_studio" ON studio_cotizacion_items
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studio_cotizaciones sc
    JOIN studio_user_profiles sup ON sup.studio_id = sc.studio_id
    WHERE sc.id = studio_cotizacion_items.cotizacion_id
    AND sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
  )
);

-- Política: Usuarios pueden crear items en cotizaciones de su studio
DROP POLICY IF EXISTS "studio_cotizacion_items_insert_studio" ON studio_cotizacion_items;
CREATE POLICY "studio_cotizacion_items_insert_studio" ON studio_cotizacion_items
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM studio_cotizaciones sc
    JOIN studio_user_profiles sup ON sup.studio_id = sc.studio_id
    WHERE sc.id = studio_cotizacion_items.cotizacion_id
    AND sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
  )
);

-- Política: Usuarios pueden actualizar items de cotizaciones de su studio
DROP POLICY IF EXISTS "studio_cotizacion_items_update_studio" ON studio_cotizacion_items;
CREATE POLICY "studio_cotizacion_items_update_studio" ON studio_cotizacion_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studio_cotizaciones sc
    JOIN studio_user_profiles sup ON sup.studio_id = sc.studio_id
    WHERE sc.id = studio_cotizacion_items.cotizacion_id
    AND sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM studio_cotizaciones sc
    JOIN studio_user_profiles sup ON sup.studio_id = sc.studio_id
    WHERE sc.id = studio_cotizacion_items.cotizacion_id
    AND sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
  )
);

-- Política: Usuarios pueden eliminar items de cotizaciones de su studio
DROP POLICY IF EXISTS "studio_cotizacion_items_delete_studio" ON studio_cotizacion_items;
CREATE POLICY "studio_cotizacion_items_delete_studio" ON studio_cotizacion_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM studio_cotizaciones sc
    JOIN studio_user_profiles sup ON sup.studio_id = sc.studio_id
    WHERE sc.id = studio_cotizacion_items.cotizacion_id
    AND sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
  )
);

-- Comentario
COMMENT ON TABLE studio_cotizacion_items IS 
  'Items de cotizaciones con RLS habilitado - usuarios solo pueden acceder a items de cotizaciones de su studio';
