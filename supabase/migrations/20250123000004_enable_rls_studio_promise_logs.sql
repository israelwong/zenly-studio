-- ============================================
-- HABILITAR RLS EN STUDIO_PROMISE_LOGS
-- ============================================
-- Asegurar que RLS esté habilitado y políticas básicas existan
-- Los logs están vinculados a promesas, así que se controla por studio de la promesa

-- Habilitar RLS si no está habilitado
ALTER TABLE public.studio_promise_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Política: Usuarios pueden leer logs de promesas de su studio
-- Acceso a través de la relación con studio_promises
DROP POLICY IF EXISTS "studio_promise_logs_read_studio" ON public.studio_promise_logs;
CREATE POLICY "studio_promise_logs_read_studio" ON public.studio_promise_logs
FOR SELECT TO authenticated
USING (
  -- Verificar que la promesa pertenece a un studio donde el usuario tiene acceso
  promise_id IN (
    SELECT p.id 
    FROM public.studio_promises p
    WHERE p.studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
);

-- Política: Usuarios pueden crear logs para promesas de su studio
-- Permite crear logs desde server actions y acciones públicas
DROP POLICY IF EXISTS "studio_promise_logs_insert_studio" ON public.studio_promise_logs;
CREATE POLICY "studio_promise_logs_insert_studio" ON public.studio_promise_logs
FOR INSERT TO authenticated
WITH CHECK (
  -- Verificar que la promesa pertenece a un studio donde el usuario tiene acceso
  promise_id IN (
    SELECT p.id 
    FROM public.studio_promises p
    WHERE p.studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
  -- Si se especifica user_id, debe ser el usuario actual o null (sistema)
  AND (
    user_id IS NULL
    OR user_id IN (
      SELECT id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
);

-- Política: Usuarios pueden actualizar logs (limitado)
-- Normalmente no se actualizan, pero permitir para flexibilidad futura
DROP POLICY IF EXISTS "studio_promise_logs_update_studio" ON public.studio_promise_logs;
CREATE POLICY "studio_promise_logs_update_studio" ON public.studio_promise_logs
FOR UPDATE TO authenticated
USING (
  -- Verificar que la promesa pertenece a un studio donde el usuario tiene acceso
  promise_id IN (
    SELECT p.id 
    FROM public.studio_promises p
    WHERE p.studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
)
WITH CHECK (
  -- No permitir cambiar promise_id
  promise_id IN (
    SELECT p.id 
    FROM public.studio_promises p
    WHERE p.studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
);

-- Política: Usuarios pueden eliminar solo sus propias notas (user_note)
-- Los logs del sistema no se pueden eliminar
DROP POLICY IF EXISTS "studio_promise_logs_delete_own_notes" ON public.studio_promise_logs;
CREATE POLICY "studio_promise_logs_delete_own_notes" ON public.studio_promise_logs
FOR DELETE TO authenticated
USING (
  -- Solo se pueden eliminar notas de usuario (user_note)
  log_type = 'user_note'
  -- Y que pertenezcan al usuario actual
  AND user_id IN (
    SELECT id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
  -- Y que la promesa pertenezca a un studio donde el usuario tiene acceso
  AND promise_id IN (
    SELECT p.id 
    FROM public.studio_promises p
    WHERE p.studio_id IN (
      SELECT studio_id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
  )
);

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE public.studio_promise_logs IS 
  'Logs de promesas con RLS habilitado - usuarios solo pueden acceder a logs de promesas de su studio';

COMMENT ON POLICY "studio_promise_logs_read_studio" ON public.studio_promise_logs IS 
  'Permite leer logs de promesas del studio del usuario';

COMMENT ON POLICY "studio_promise_logs_insert_studio" ON public.studio_promise_logs IS 
  'Permite crear logs para promesas del studio (desde server actions y acciones públicas)';

COMMENT ON POLICY "studio_promise_logs_update_studio" ON public.studio_promise_logs IS 
  'Permite actualizar logs de promesas del studio (limitado)';

COMMENT ON POLICY "studio_promise_logs_delete_own_notes" ON public.studio_promise_logs IS 
  'Permite eliminar solo notas de usuario propias (user_note), no logs del sistema';
