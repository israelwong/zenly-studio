-- ============================================
-- HABILITAR RLS EN STUDIO_USER_PROFILES
-- ============================================
-- Asegurar que RLS esté habilitado y políticas básicas existan

-- Habilitar RLS si no está habilitado
ALTER TABLE studio_user_profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuarios pueden leer su propio perfil
DROP POLICY IF EXISTS "studio_user_profiles_read_own" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_read_own" ON studio_user_profiles
FOR SELECT TO authenticated
USING (
  supabase_id = auth.uid()::text
);

-- Política: Usuarios pueden leer perfiles del mismo studio
DROP POLICY IF EXISTS "studio_user_profiles_read_studio" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_read_studio" ON studio_user_profiles
FOR SELECT TO authenticated
USING (
  studio_id IN (
    SELECT studio_id FROM studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "studio_user_profiles_update_own" ON studio_user_profiles;
CREATE POLICY "studio_user_profiles_update_own" ON studio_user_profiles
FOR UPDATE TO authenticated
USING (supabase_id = auth.uid()::text)
WITH CHECK (supabase_id = auth.uid()::text);

-- Comentario
COMMENT ON TABLE studio_user_profiles IS 
  'Perfiles de usuarios con RLS habilitado - sincronizado con auth.users';

