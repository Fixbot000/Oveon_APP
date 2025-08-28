-- Make device-images bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'device-images';

-- Remove public read policy for device-images
DROP POLICY IF EXISTS "Public read for device-images" ON storage.objects;

-- Add proper RLS policies for device-images bucket
CREATE POLICY "Users can view their own device images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'device-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add proper RLS policies for avatars bucket
CREATE POLICY "Users can upload their own avatars" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatars" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own avatars" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Keep avatars publicly readable (standard for profile images)
CREATE POLICY "Avatars are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Create function usage tracking table for rate limiting
CREATE TABLE public.function_usage (
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

-- Clean up duplicate RLS policies on posts
DROP POLICY IF EXISTS "Anyone can view posts" ON posts;
DROP POLICY IF EXISTS "Anyone can view comments" ON comments;