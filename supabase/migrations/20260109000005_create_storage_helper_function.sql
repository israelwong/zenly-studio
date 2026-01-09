-- ============================================
-- CREATE: Función helper para verificar acceso a studio en Storage RLS
-- ============================================
-- Esta función simplifica la verificación de acceso y puede ser más eficiente
-- en el contexto de Storage RLS

CREATE OR REPLACE FUNCTION public.user_has_studio_access(studio_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM studios s
    WHERE s.slug = studio_slug
    AND (
      -- Verificar acceso a través de user_studio_roles
      EXISTS (
        SELECT 1 
        FROM user_studio_roles usr
        JOIN users u ON u.id = usr.user_id
        WHERE u.supabase_id = auth.uid()::text
        AND usr.studio_id = s.id
        AND usr.is_active = true
      )
      -- O verificar acceso a través de studio_user_profiles
      OR EXISTS (
        SELECT 1 
        FROM studio_user_profiles sup
        WHERE sup.supabase_id = auth.uid()::text
        AND sup.studio_id = s.id
        AND sup.is_active = true
      )
    )
  );
$$;

-- Comentario
COMMENT ON FUNCTION public.user_has_studio_access IS 
  'Verifica si el usuario autenticado tiene acceso al studio especificado por slug';

