-- Remove sensitive phone field from profiles table to reduce data exposure
ALTER TABLE public.profiles DROP COLUMN IF EXISTS phone;