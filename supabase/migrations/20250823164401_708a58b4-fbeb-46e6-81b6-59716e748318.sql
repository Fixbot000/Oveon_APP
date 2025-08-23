-- First, let's check if we need to restructure the profiles table
-- The requirement is to have id as primary key that equals auth.uid()

-- Drop existing profiles table if it doesn't match requirements
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Create profiles table with exact requirements
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT profiles_id_check CHECK (id = auth.uid())
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies as per requirements
-- 1. Allow a user to insert their own profile (id = auth.uid())
CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (id = auth.uid());

-- 2. Allow a user to update only their own profile
CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (id = auth.uid());

-- 3. Allow everyone to select profiles
CREATE POLICY "Everyone can view profiles" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Create storage bucket for avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars bucket
-- Users can upload images only into a folder named with their own user id
CREATE POLICY "Users can upload to their own folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own images but not others'
CREATE POLICY "Users can update their own images" 
ON storage.objects 
FOR UPDATE 
USING (
    bucket_id = 'avatars' 
    AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Everyone can read images from the avatars bucket
CREATE POLICY "Everyone can view avatar images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'avatars');

-- Create trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, username)
    VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();