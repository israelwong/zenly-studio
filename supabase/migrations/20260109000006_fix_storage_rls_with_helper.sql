-- ============================================
-- FIX: Storage RLS Policies - Usando función helper
-- ============================================
-- Actualiza las políticas RLS para usar la función helper que simplifica la verificación

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
  -- Usar función helper para verificar acceso
  AND public.user_has_studio_access((storage.foldername(name))[2]::text)
);

-- Policy 2: Allow authenticated users to read media from their studios
CREATE POLICY "Allow authenticated users to read media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Usar función helper para verificar acceso
  AND public.user_has_studio_access((storage.foldername(name))[2]::text)
);

-- Policy 3: Allow authenticated users to delete media from their studios
CREATE POLICY "Allow authenticated users to delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Usar función helper para verificar acceso
  AND public.user_has_studio_access((storage.foldername(name))[2]::text)
);

-- Policy 4: Allow authenticated users to update media from their studios
CREATE POLICY "Allow authenticated users to update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Usar función helper para verificar acceso
  AND public.user_has_studio_access((storage.foldername(name))[2]::text)
)
WITH CHECK (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
  -- Usar función helper para verificar acceso
  AND public.user_has_studio_access((storage.foldername(name))[2]::text)
);

