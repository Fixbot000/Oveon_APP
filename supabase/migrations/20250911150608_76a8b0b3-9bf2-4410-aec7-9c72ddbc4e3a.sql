-- Add daily scan tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN daily_scans integer DEFAULT 0,
ADD COLUMN last_scan_date date DEFAULT CURRENT_DATE;

-- Update existing profiles to have the new fields
UPDATE public.profiles 
SET daily_scans = 0, last_scan_date = CURRENT_DATE 
WHERE daily_scans IS NULL OR last_scan_date IS NULL;