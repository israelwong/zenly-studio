-- ============================================
-- FIX: Storage RLS Policies - Versión final optimizada
-- ============================================
-- Política que verifica acceso al studio usando una subconsulta más eficiente

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Allow authenticated users to upload media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update media" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to their studio folder
CREATE POLICY "Allow authenticated users to upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Studio' 
  AND (storage.foldername(name))[1] = 'studios'
  -- Verificar que el usuario tenga acceso al studio del path
  AND EXISTS (
    SELECT 1 
    FROM studios s
    WHERE s.slug = (storage.foldername(name))[2]::text
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
  )
);

-- Policy 2: Allow authenticated users to read media from their studios
CREATE POLICY "Allow authenticated users to read media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Verificar que el usuario tenga acceso al studio del path
  AND EXISTS (
    SELECT 1 
    FROM studios s
    WHERE s.slug = (storage.foldername(name))[2]::text
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
  )
);

-- Policy 3: Allow authenticated users to delete media from their studios
CREATE POLICY "Allow authenticated users to delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Verificar que el usuario tenga acceso al studio del path
  AND EXISTS (
    SELECT 1 
    FROM studios s
    WHERE s.slug = (storage.foldername(name))[2]::text
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
  )
);

-- Policy 4: Allow authenticated users to update media from their studios
CREATE POLICY "Allow authenticated users to update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Verificar que el usuario tenga acceso al studio del path
  AND EXISTS (
    SELECT 1 
    FROM studios s
    WHERE s.slug = (storage.foldername(name))[2]::text
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
  )
)
WITH CHECK (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Verificar que el usuario tenga acceso al studio del path
  AND EXISTS (
    SELECT 1 
    FROM studios s
    WHERE s.slug = (storage.foldername(name))[2]::text
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
  )
);

