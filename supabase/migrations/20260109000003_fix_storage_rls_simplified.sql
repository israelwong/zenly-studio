-- ============================================
-- FIX: Storage RLS Policies - Versión simplificada para debug
-- ============================================
-- Política temporal más permisiva para identificar el problema

-- Eliminar políticas antiguas
DROP POLICY IF EXISTS "Allow authenticated users to upload media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to read media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to delete media" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to update media" ON storage.objects;

-- Policy 1: Allow authenticated users to upload to their studio folder
-- Versión simplificada: solo verifica que esté autenticado y el path sea correcto
-- TODO: Agregar verificación de acceso al studio después de confirmar que funciona
CREATE POLICY "Allow authenticated users to upload media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Studio' 
  AND (storage.foldername(name))[1] = 'studios'
  -- Temporalmente permitir a todos los usuarios autenticados
  -- Después de confirmar que funciona, agregar verificación de acceso al studio
);

-- Policy 2: Allow authenticated users to read media
CREATE POLICY "Allow authenticated users to read media"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
);

-- Policy 3: Allow authenticated users to delete media
CREATE POLICY "Allow authenticated users to delete media"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
);

-- Policy 4: Allow authenticated users to update media
CREATE POLICY "Allow authenticated users to update media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
)
WITH CHECK (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
);

