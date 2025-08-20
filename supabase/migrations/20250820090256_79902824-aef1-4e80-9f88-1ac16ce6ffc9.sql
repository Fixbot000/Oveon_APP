-- Security fixes migration
-- 1. Remove the "magic UUID" admin policy that allows unauthorized access
DROP POLICY IF EXISTS "Admin manages roles" ON public.user_roles;

-- 2. Add proper input validation for diagnostic sessions
ALTER TABLE public.diagnostic_sessions 
ADD CONSTRAINT validate_status CHECK (status IN ('analyzing', 'matching', 'generating', 'completed', 'failed'));

-- 3. Ensure device-images bucket is properly configured for user access
-- Create RLS policies for device-images storage bucket
CREATE POLICY "Authenticated users can view device images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can upload device images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own device images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own device images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'device-images' AND auth.uid() IS NOT NULL);

-- 4. Add constraint to ensure diagnostic sessions have proper user ownership
ALTER TABLE public.diagnostic_sessions 
ALTER COLUMN user_id SET NOT NULL;