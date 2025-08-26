-- Ensure RLS is enabled on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Public read access for device-images bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Public read for device-images'
  ) THEN
    CREATE POLICY "Public read for device-images"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'device-images');
  END IF;
END $$;

-- Allow authenticated users to upload files to their own folder in device-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can upload to own folder in device-images'
  ) THEN
    CREATE POLICY "Users can upload to own folder in device-images"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'device-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow authenticated users to update files in their own folder in device-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can update own files in device-images'
  ) THEN
    CREATE POLICY "Users can update own files in device-images"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'device-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

-- Allow authenticated users to delete files in their own folder in device-images
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
      AND tablename = 'objects' 
      AND policyname = 'Users can delete own files in device-images'
  ) THEN
    CREATE POLICY "Users can delete own files in device-images"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'device-images'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;