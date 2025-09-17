-- Add premium_expiry column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN premium_expiry timestamp with time zone;