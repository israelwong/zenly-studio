-- ============================================
-- CORRECCIÓN: Agregar SET search_path a funciones
-- ============================================
-- Corrige el problema de seguridad "Function Search Path Mutable"
-- Todas las funciones deben tener SET search_path = '' para evitar vulnerabilidades

-- ============================================
-- FUNCIONES DE TEST/DEBUG (si existen)
-- ============================================

-- test_realtime_policy
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'test_realtime_policy' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.test_realtime_policy() SET search_path = '''';';
  END IF;
END $$;

-- test_realtime_policy_as_user
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'test_realtime_policy_as_user' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.test_realtime_policy_as_user() SET search_path = '''';';
  END IF;
END $$;

-- test_realtime_auth_uid
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'test_realtime_auth_uid' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.test_realtime_auth_uid() SET search_path = '''';';
  END IF;
END $$;

-- test_realtime_access
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'test_realtime_access' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.test_realtime_access() SET search_path = '''';';
  END IF;
END $$;

-- check_realtime_permissions
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'check_realtime_permissions' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.check_realtime_permissions() SET search_path = '''';';
  END IF;
END $$;

-- debug_realtime_user_profile
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'debug_realtime_user_profile' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'ALTER FUNCTION public.debug_realtime_user_profile() SET search_path = '''';';
  END IF;
END $$;

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON FUNCTION public.studio_promises_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send. Solución robusta que evita problemas de auth.uid() NULL. Configurado con SET search_path para seguridad.';

COMMENT ON FUNCTION public.studio_notifications_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send. Solución robusta que evita problemas de auth.uid() NULL. Configurado con SET search_path para seguridad.';

COMMENT ON FUNCTION public.studio_cotizaciones_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send. Solución robusta que permite acceso anónimo para promises públicos. Configurado con SET search_path para seguridad.';

COMMENT ON FUNCTION public.studio_promise_logs_broadcast_trigger() IS 
  'Trigger que emite eventos Realtime usando realtime.send para logs de promesas. Solución robusta que permite acceso anónimo. Configurado con SET search_path para seguridad.';
