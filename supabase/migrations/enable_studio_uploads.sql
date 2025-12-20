-- Enable RLS policies for Studio bucket media uploads
-- Allows authenticated users to upload, read, update, and delete media

-- Policy 1: Allow authenticated users to upload to their studio folder
CREATE POLICY "Allow authenticated users to upload media"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'Studio' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'studios'
);

-- Policy 2: Allow authenticated users to read media
CREATE POLICY "Allow authenticated users to read media"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'Studio'
  AND (storage.foldername(name))[1] = 'studios'
);

-- Policy 3: Allow authenticated users to delete their own media
CREATE POLICY "Allow authenticated users to delete media"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'Studio'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'studios'
);

-- Policy 4: Allow authenticated users to update media
CREATE POLICY "Allow authenticated users to update media"
ON storage.objects
FOR UPDATE
WITH CHECK (
  bucket_id = 'Studio'
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = 'studios'
);
