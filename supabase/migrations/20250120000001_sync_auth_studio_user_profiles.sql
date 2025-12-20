-- ============================================
-- SYNC AUTH USERS → STUDIO_USER_PROFILES
-- ============================================
-- Este trigger crea/actualiza automáticamente registros en studio_user_profiles
-- cuando se crean usuarios en Supabase Auth

-- PASO 1: Asegurar que columna supabase_id existe (ya existe en schema)
-- La columna studio_user_profiles.supabase_id ya está definida en schema.prisma

-- PASO 2: Función que sincroniza auth.users → studio_user_profiles
CREATE OR REPLACE FUNCTION sync_auth_user_to_profile()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
  user_full_name TEXT;
  user_role TEXT;
  user_studio_slug TEXT;
BEGIN
  -- Extraer datos de user_metadata
  user_full_name := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email);
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'suscriptor');
  user_studio_slug := NEW.raw_user_meta_data->>'studio_slug';

  -- Insertar o actualizar perfil
  INSERT INTO studio_user_profiles (
    id,
    email,
    supabase_id,
    full_name,
    role,
    studio_id,
    is_active,
    created_at,
    updated_at
  )
  VALUES (
    gen_random_uuid()::text,
    NEW.email,
    NEW.id::text,
    user_full_name,
    CASE 
      WHEN user_role = 'super_admin' THEN 'SUPER_ADMIN'::text
      WHEN user_role = 'agente' THEN 'AGENTE'::text
      ELSE 'SUSCRIPTOR'::text
    END,
    (SELECT id FROM studios WHERE slug = user_studio_slug LIMIT 1),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (supabase_id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    studio_id = EXCLUDED.studio_id,
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- PASO 3: Trigger en auth.users (requiere permisos de admin)
-- Nota: Esto funciona en Supabase local/self-hosted
-- En cloud, usar webhooks o crear desde dashboard
CREATE OR REPLACE TRIGGER on_auth_user_created_or_updated
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_auth_user_to_profile();

-- PASO 4: Migrar usuarios existentes que no tienen supabase_id
UPDATE studio_user_profiles sup
SET supabase_id = au.id::text,
    updated_at = NOW()
FROM auth.users au
WHERE sup.email = au.email
  AND sup.supabase_id IS NULL;

-- PASO 5: Comentarios
COMMENT ON FUNCTION sync_auth_user_to_profile() IS 
  'Sincroniza automáticamente usuarios de auth.users a studio_user_profiles al crear/actualizar';

COMMENT ON TRIGGER on_auth_user_created_or_updated ON auth.users IS
  'Mantiene studio_user_profiles sincronizado con auth.users';

