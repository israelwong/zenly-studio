-- Script de diagnóstico para problemas de Realtime
-- Ejecutar en Supabase SQL Editor

-- 1. Verificar que las políticas RLS existen
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

-- 2. Verificar usuarios con supabase_id
SELECT 
    email,
    supabase_id,
    studio_id,
    is_active,
    role
FROM studio_user_profiles 
WHERE supabase_id IS NOT NULL
ORDER BY email;

-- 3. Verificar relación usuario-studio
SELECT 
    sup.email,
    sup.supabase_id,
    sup.studio_id,
    s.slug,
    sup.is_active
FROM studio_user_profiles sup
LEFT JOIN studios s ON s.id = sup.studio_id
WHERE sup.supabase_id IS NOT NULL
ORDER BY sup.email;

-- 4. Verificar que el usuario específico tiene todo correcto
-- Reemplaza 'owner@demo-studio.com' con el email del usuario que está probando
SELECT 
    sup.email,
    sup.supabase_id,
    sup.studio_id,
    s.slug,
    sup.is_active,
    -- Verificar que el supabase_id coincide con auth.users
    au.id as auth_user_id,
    au.email as auth_email
FROM studio_user_profiles sup
JOIN studios s ON s.id = sup.studio_id
LEFT JOIN auth.users au ON au.id::text = sup.supabase_id
WHERE sup.email = 'owner@demo-studio.com';

-- 5. Probar la política manualmente (simular auth.uid())
-- Reemplaza 'TU_SUPABASE_ID_AQUI' con el supabase_id del usuario
-- Puedes obtenerlo de la consulta anterior
SELECT 
    'studio:demo-studio:notifications' as topic,
    EXISTS (
        SELECT 1 FROM studio_user_profiles sup
        JOIN studios s ON s.id = sup.studio_id
        WHERE sup.supabase_id = 'TU_SUPABASE_ID_AQUI'  -- Reemplazar con supabase_id real
        AND sup.is_active = true
        AND s.slug = 'demo-studio'
    ) as tiene_acceso;

-- 6. Verificar índices
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'studio_user_profiles'
AND indexname LIKE '%supabase%';

