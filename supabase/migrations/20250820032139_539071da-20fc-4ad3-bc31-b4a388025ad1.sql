-- CRITICAL SECURITY FIXES

-- 1. Fix profiles policy to be owner-only (most critical)
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Create roles system for admin-managed content
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" 
ON public.user_roles 
FOR ALL 
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Restrict content tables to admin-only modifications
-- Boards table
DROP POLICY IF EXISTS "Allow authenticated users to insert boards" ON public.boards;
DROP POLICY IF EXISTS "Allow authenticated users to update boards" ON public.boards;
DROP POLICY IF EXISTS "Allow authenticated users to delete boards" ON public.boards;

CREATE POLICY "Only admins can insert boards" 
ON public.boards 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update boards" 
ON public.boards 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete boards" 
ON public.boards 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Components table
DROP POLICY IF EXISTS "Allow authenticated users to insert components" ON public.components;
DROP POLICY IF EXISTS "Allow authenticated users to update components" ON public.components;
DROP POLICY IF EXISTS "Allow authenticated users to delete components" ON public.components;

CREATE POLICY "Only admins can insert components" 
ON public.components 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update components" 
ON public.components 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete components" 
ON public.components 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Devices table
DROP POLICY IF EXISTS "Allow authenticated users to insert devices" ON public.devices;
DROP POLICY IF EXISTS "Allow authenticated users to update devices" ON public.devices;
DROP POLICY IF EXISTS "Allow authenticated users to delete devices" ON public.devices;

CREATE POLICY "Only admins can insert devices" 
ON public.devices 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update devices" 
ON public.devices 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete devices" 
ON public.devices 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- Instruments table
DROP POLICY IF EXISTS "Allow authenticated users to insert instruments" ON public.instruments;
DROP POLICY IF EXISTS "Allow authenticated users to update instruments" ON public.instruments;
DROP POLICY IF EXISTS "Allow authenticated users to delete instruments" ON public.instruments;

CREATE POLICY "Only admins can insert instruments" 
ON public.instruments 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update instruments" 
ON public.instruments 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete instruments" 
ON public.instruments 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- PCBs table
DROP POLICY IF EXISTS "Allow authenticated users to insert PCBs" ON public.pcbs;
DROP POLICY IF EXISTS "Allow authenticated users to update PCBs" ON public.pcbs;
DROP POLICY IF EXISTS "Allow authenticated users to delete PCBs" ON public.pcbs;

CREATE POLICY "Only admins can insert PCBs" 
ON public.pcbs 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update PCBs" 
ON public.pcbs 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete PCBs" 
ON public.pcbs 
FOR DELETE 
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Fix update_updated_at_column function security
DROP FUNCTION IF EXISTS public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 5. Add storage policies for ASdata bucket
CREATE POLICY "Users can view their own files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'ASdata' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'ASdata' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'ASdata' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'ASdata' AND auth.uid()::text = (storage.foldername(name))[1]);