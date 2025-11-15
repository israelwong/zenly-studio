-- ============================================
-- FIX RLS STUDIO_NOTIFICATIONS
-- ============================================
-- Habilitar RLS y crear políticas para Realtime

-- 1. Habilitar RLS
ALTER TABLE studio_notifications ENABLE ROW LEVEL SECURITY;

-- 2. Política de lectura: usuarios pueden leer sus propias notificaciones
DROP POLICY IF EXISTS "studio_notifications_read_own" ON studio_notifications;
CREATE POLICY "studio_notifications_read_own" ON studio_notifications
FOR SELECT TO authenticated
USING (user_id = auth.uid()::text);

-- 3. Política de actualización: usuarios pueden actualizar sus propias notificaciones
DROP POLICY IF EXISTS "studio_notifications_update_own" ON studio_notifications;
CREATE POLICY "studio_notifications_update_own" ON studio_notifications
FOR UPDATE TO authenticated
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- 4. Política de inserción: el sistema puede crear notificaciones
-- (normalmente las notificaciones se crean vía triggers o server actions)
DROP POLICY IF EXISTS "studio_notifications_insert_system" ON studio_notifications;
CREATE POLICY "studio_notifications_insert_system" ON studio_notifications
FOR INSERT TO authenticated
WITH CHECK (true); -- Permitir que cualquier usuario autenticado inserte (el trigger valida)

-- 5. IMPORTANTE: Habilitar Realtime para la tabla (si no está ya)
-- Nota: Si ya está, este comando fallará pero es OK
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE studio_notifications;
EXCEPTION
  WHEN duplicate_object THEN
    NULL; -- Ya existe, ignorar
END $$;

-- 6. Verificación
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'studio_notifications'
ORDER BY policyname;

-- Verificar que Realtime está habilitado
SELECT 
  schemaname, 
  tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename = 'studio_notifications';

