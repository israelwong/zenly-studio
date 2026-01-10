-- ============================================
-- DEBUG: Query de diagnóstico para Storage RLS
-- ============================================
-- Ejecuta esta query para verificar si el usuario tiene acceso al studio

-- Verificar acceso del usuario al studio 'prosocial'
SELECT 
  'user_studio_roles' as source,
  u.id as user_id,
  u.email,
  u.supabase_id,
  s.id as studio_id,
  s.slug as studio_slug,
  usr.role,
  usr.is_active,
  usr.accepted_at
FROM users u
LEFT JOIN user_studio_roles usr ON usr.user_id = u.id
LEFT JOIN studios s ON s.id = usr.studio_id
WHERE u.supabase_id = '673b55f9-1053-42a0-bd80-931ad203c1b6'
  AND s.slug = 'prosocial'
  AND usr.is_active = true

UNION ALL

SELECT 
  'studio_user_profiles' as source,
  u.id as user_id,
  u.email,
  u.supabase_id,
  s.id as studio_id,
  s.slug as studio_slug,
  NULL as role,
  sup.is_active,
  NULL as accepted_at
FROM users u
LEFT JOIN studio_user_profiles sup ON sup.supabase_id = u.supabase_id
LEFT JOIN studios s ON s.id = sup.studio_id
WHERE u.supabase_id = '673b55f9-1053-42a0-bd80-931ad203c1b6'
  AND s.slug = 'prosocial'
  AND sup.is_active = true;

-- Verificar todos los studios a los que tiene acceso el usuario
SELECT 
  'user_studio_roles' as source,
  s.slug as studio_slug,
  usr.role,
  usr.is_active
FROM users u
JOIN user_studio_roles usr ON usr.user_id = u.id
JOIN studios s ON s.id = usr.studio_id
WHERE u.supabase_id = '673b55f9-1053-42a0-bd80-931ad203c1b6'
  AND usr.is_active = true

UNION ALL

SELECT 
  'studio_user_profiles' as source,
  s.slug as studio_slug,
  NULL as role,
  sup.is_active
FROM users u
JOIN studio_user_profiles sup ON sup.supabase_id = u.supabase_id
JOIN studios s ON s.id = sup.studio_id
WHERE u.supabase_id = '673b55f9-1053-42a0-bd80-931ad203c1b6'
  AND sup.is_active = true
  AND sup.studio_id IS NOT NULL;

