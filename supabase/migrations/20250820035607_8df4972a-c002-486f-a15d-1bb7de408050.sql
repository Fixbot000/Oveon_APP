-- Critical Security Fixes Migration

-- 1. Remove unsafe policies from auth.users table (reserved schema)
DROP POLICY IF EXISTS "Users can view their own profile" ON auth.users;
DROP POLICY IF EXISTS "Users can update their own profile" ON auth.users;  
DROP POLICY IF EXISTS "Users can insert own profile" ON auth.users;

-- 2. Harden role management policies on user_roles table
-- Drop existing broad policy and replace with specific ones
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;

-- Create specific policies for role management
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can insert roles" ON public.user_roles  
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can update roles" ON public.user_roles
FOR UPDATE  
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete roles" ON public.user_roles
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 3. Enforce one profile per user with unique constraint
-- Check if constraint already exists first
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'profiles_user_id_unique'
  ) THEN
    ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_user_id_unique UNIQUE (user_id);
  END IF;
END $$;

-- 4. Ensure profiles table has proper NOT NULL constraint on user_id for security
ALTER TABLE public.profiles ALTER COLUMN user_id SET NOT NULL;