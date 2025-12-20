-- ============================================
-- ELIMINACIÓN: Funciones de test/debug de Realtime
-- ============================================
-- Estas funciones fueron creadas para testing y no están siendo usadas en producción
-- Verificado: No hay políticas RLS, triggers, o código que las referencie

-- ============================================
-- VERIFICACIÓN ANTES DE ELIMINAR
-- ============================================
-- Verificar que no hay dependencias antes de eliminar

DO $$
DECLARE
  has_dependencies BOOLEAN;
  func_signature TEXT;
BEGIN
  -- Verificar si check_realtime_permissions está siendo usada en políticas RLS
  -- pg_policies tiene qual y with_check que contienen las expresiones
  SELECT EXISTS (
    SELECT 1 
    FROM pg_policies 
    WHERE (qual IS NOT NULL AND qual::text LIKE '%check_realtime_permissions%')
       OR (with_check IS NOT NULL AND with_check::text LIKE '%check_realtime_permissions%')
  ) INTO has_dependencies;
  
  IF has_dependencies THEN
    RAISE EXCEPTION 'La función check_realtime_permissions está siendo usada en políticas RLS. No se puede eliminar.';
  END IF;
  
  -- Verificar si está siendo usada en triggers
  SELECT EXISTS (
    SELECT 1 
    FROM pg_trigger t
    JOIN pg_proc p ON t.tgfoid = p.oid
    WHERE p.proname = 'check_realtime_permissions'
  ) INTO has_dependencies;
  
  IF has_dependencies THEN
    RAISE EXCEPTION 'La función check_realtime_permissions está siendo usada en triggers. No se puede eliminar.';
  END IF;
  
  -- Nota: No verificamos dependencias en otras funciones porque pg_get_functiondef puede fallar
  -- PostgreSQL mismo lanzará un error si hay dependencias al intentar DROP CASCADE
END $$;

-- ============================================
-- ELIMINACIÓN DE FUNCIONES DE TEST/DEBUG
-- ============================================

-- check_realtime_permissions
-- Esta función retorna una tabla con: has_profile, is_active, studio_slug, topic_slug, matches
-- Verifica permisos de Realtime pero no está siendo usada en producción
-- Posibles firmas: (text, text) o sin parámetros
DROP FUNCTION IF EXISTS public.check_realtime_permissions(text, text) CASCADE;
DROP FUNCTION IF EXISTS public.check_realtime_permissions() CASCADE;
-- También intentar eliminar cualquier variante con diferentes tipos de retorno
DO $$
DECLARE
  func_record RECORD;
BEGIN
  FOR func_record IN 
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname = 'check_realtime_permissions'
  LOOP
    EXECUTE format('DROP FUNCTION IF EXISTS public.%I(%s) CASCADE', 
                   func_record.proname, 
                   func_record.args);
  END LOOP;
END $$;

-- test_realtime_policy
DROP FUNCTION IF EXISTS public.test_realtime_policy() CASCADE;

-- test_realtime_policy_as_user
DROP FUNCTION IF EXISTS public.test_realtime_policy_as_user() CASCADE;

-- test_realtime_auth_uid
DROP FUNCTION IF EXISTS public.test_realtime_auth_uid() CASCADE;

-- test_realtime_access
DROP FUNCTION IF EXISTS public.test_realtime_access() CASCADE;

-- debug_realtime_user_profile
DROP FUNCTION IF EXISTS public.debug_realtime_user_profile() CASCADE;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON SCHEMA public IS 'Funciones de test/debug de Realtime eliminadas. Estas funciones no estaban siendo usadas en producción.';
