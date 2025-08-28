-- Make device-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'device-images';

-- Create function usage tracking table for rate limiting (if not exists)
CREATE TABLE IF NOT EXISTS public.function_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, function_name, window_start)
);

-- Enable RLS on function_usage
ALTER TABLE public.function_usage ENABLE ROW LEVEL SECURITY;

-- Users can only see their own usage stats
CREATE POLICY "Users can view their own function usage" 
ON public.function_usage 
FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own usage records
CREATE POLICY "Users can insert their own function usage" 
ON public.function_usage 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own usage records
CREATE POLICY "Users can update their own function usage" 
ON public.function_usage 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add device images policy if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Users can view their own device images'
  ) THEN
    CREATE POLICY "Users can view their own device images" 
    ON storage.objects 
    FOR SELECT 
    USING (bucket_id = 'device-images' AND auth.uid()::text = (storage.foldername(name))[1]);
  END IF;
END $$;