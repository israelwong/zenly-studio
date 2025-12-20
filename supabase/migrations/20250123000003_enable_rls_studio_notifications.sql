-- ============================================
-- HABILITAR RLS EN STUDIO_NOTIFICATIONS
-- ============================================
-- Asegurar que RLS esté habilitado y políticas básicas existan
-- Las notificaciones son privadas por usuario dentro de un studio

-- Habilitar RLS si no está habilitado
ALTER TABLE public.studio_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS
-- ============================================

-- Política: Usuarios pueden leer sus propias notificaciones del studio
-- Solo pueden ver notificaciones donde user_id coincide con su perfil
DROP POLICY IF EXISTS "studio_notifications_read_own" ON public.studio_notifications;
CREATE POLICY "studio_notifications_read_own" ON public.studio_notifications
FOR SELECT TO authenticated
USING (
  -- Verificar que el usuario tenga perfil activo en el studio
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
  -- Y que la notificación sea para este usuario específico
  AND (
    user_id IN (
      SELECT id FROM public.studio_user_profiles
      WHERE supabase_id = auth.uid()::text
      AND is_active = true
    )
    -- O notificaciones de scope STUDIO para usuarios del mismo studio
    OR (
      scope = 'STUDIO'
      AND studio_id IN (
        SELECT studio_id FROM public.studio_user_profiles
        WHERE supabase_id = auth.uid()::text
        AND is_active = true
      )
    )
  )
);

-- Política: Usuarios pueden crear notificaciones en su studio
-- Normalmente se hace desde server actions, pero permitir para flexibilidad
DROP POLICY IF EXISTS "studio_notifications_insert_studio" ON public.studio_notifications;
CREATE POLICY "studio_notifications_insert_studio" ON public.studio_notifications
FOR INSERT TO authenticated
WITH CHECK (
  studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
  -- Solo pueden crear notificaciones para usuarios de su mismo studio
  AND (
    user_id IS NULL
    OR user_id IN (
      SELECT id FROM public.studio_user_profiles
      WHERE studio_id = studio_notifications.studio_id
      AND is_active = true
    )
  )
);

-- Política: Usuarios pueden actualizar sus propias notificaciones
-- Solo pueden marcar como leída, clickeada, etc.
DROP POLICY IF EXISTS "studio_notifications_update_own" ON public.studio_notifications;
CREATE POLICY "studio_notifications_update_own" ON public.studio_notifications
FOR UPDATE TO authenticated
USING (
  -- Verificar que la notificación pertenece al usuario
  user_id IN (
    SELECT id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
  AND studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
)
WITH CHECK (
  -- No permitir cambiar user_id, studio_id, o campos críticos
  user_id IN (
    SELECT id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
  AND studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- Política: Usuarios pueden eliminar sus propias notificaciones
DROP POLICY IF EXISTS "studio_notifications_delete_own" ON public.studio_notifications;
CREATE POLICY "studio_notifications_delete_own" ON public.studio_notifications
FOR DELETE TO authenticated
USING (
  user_id IN (
    SELECT id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
  AND studio_id IN (
    SELECT studio_id FROM public.studio_user_profiles
    WHERE supabase_id = auth.uid()::text
    AND is_active = true
  )
);

-- ============================================
-- COMENTARIOS
-- ============================================
COMMENT ON TABLE public.studio_notifications IS 
  'Notificaciones con RLS habilitado - usuarios solo pueden acceder a sus propias notificaciones del studio';

COMMENT ON POLICY "studio_notifications_read_own" ON public.studio_notifications IS 
  'Permite leer notificaciones propias o de scope STUDIO del mismo studio';

COMMENT ON POLICY "studio_notifications_insert_studio" ON public.studio_notifications IS 
  'Permite crear notificaciones en el studio (normalmente desde server actions)';

COMMENT ON POLICY "studio_notifications_update_own" ON public.studio_notifications IS 
  'Permite actualizar solo las propias notificaciones (marcar como leída, etc.)';

COMMENT ON POLICY "studio_notifications_delete_own" ON public.studio_notifications IS 
  'Permite eliminar solo las propias notificaciones';
