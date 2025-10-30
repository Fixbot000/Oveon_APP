-- Add identify limit columns to profiles table
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS remainingidentify integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS lastidentifyreset date;