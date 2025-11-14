-- Script para verificar y corregir políticas RLS de Realtime
-- Ejecutar en Supabase SQL Editor

-- PASO 1: Verificar que las políticas existen
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual::text as using_clause,
    with_check::text as with_check_clause
FROM pg_policies 
WHERE tablename = 'messages' 
AND policyname LIKE '%studio_notifications%'
ORDER BY policyname;

-- Si no aparecen políticas, ejecutar el siguiente bloque:

-- PASO 2: Eliminar políticas existentes (si hay problemas)
DROP POLICY IF EXISTS "studio_notifications_can_read_broadcasts" ON realtime.messages;
DROP POLICY IF EXISTS "studio_notifications_can_write_broadcasts" ON realtime.messages;

-- PASO 3: Crear políticas correctamente con cast UUID::text
CREATE POLICY "studio_notifications_can_read_broadcasts" ON realtime.messages
FOR SELECT TO authenticated
USING (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

CREATE POLICY "studio_notifications_can_write_broadcasts" ON realtime.messages
FOR INSERT TO authenticated
WITH CHECK (
  topic LIKE 'studio:%:notifications' AND
  EXISTS (
    SELECT 1 FROM studio_user_profiles sup
    JOIN studios s ON s.id = sup.studio_id
    WHERE sup.supabase_id = auth.uid()::text
    AND sup.is_active = true
    AND s.slug = SPLIT_PART(topic, ':', 2)
  )
);

-- PASO 4: Verificar usuarios y sus supabase_id
SELECT 
    sup.email,
    sup.supabase_id,
    sup.studio_id,
    s.slug,
    sup.is_active,
    -- Verificar coincidencia con auth.users
    au.id as auth_user_id,
    CASE 
        WHEN au.id::text = sup.supabase_id THEN '✅ Coincide'
        ELSE '❌ No coincide'
    END as verificacion
FROM studio_user_profiles sup
LEFT JOIN studios s ON s.id = sup.studio_id
LEFT JOIN auth.users au ON au.email = sup.email
WHERE sup.email = 'owner@demo-studio.com' OR sup.supabase_id IS NOT NULL
ORDER BY sup.email;

-- PASO 5: Probar la política manualmente (reemplaza con tu supabase_id real)
-- Obtén el supabase_id de la consulta anterior y reemplázalo aquí:
/*
SELECT 
    'studio:demo-studio:notifications' as topic,
    auth.uid()::text as current_auth_uid,
    EXISTS (
        SELECT 1 FROM studio_user_profiles sup
        JOIN studios s ON s.id = sup.studio_id
        WHERE sup.supabase_id = auth.uid()::text
        AND sup.is_active = true
        AND s.slug = 'demo-studio'
    ) as tiene_acceso;
*/

-- PASO 6: Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'studio_user_profiles'
AND (indexname LIKE '%supabase%' OR indexname LIKE '%email%')
ORDER BY indexname;

