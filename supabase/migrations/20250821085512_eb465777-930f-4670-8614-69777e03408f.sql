-- Allow all authenticated users to read usernames from profiles
-- This enables community features where users can see who posted what

-- Drop the restrictive policy that only allows users to see their own profiles
DROP POLICY IF EXISTS "Users can view own profile only" ON public.profiles;

-- Create a new policy that allows all authenticated users to read profiles
-- This is needed for community features where users need to see who posted what
CREATE POLICY "Authenticated users can read all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

-- Keep the existing policies for INSERT and UPDATE unchanged
-- Users can still only create and update their own profiles