-- Fix security vulnerability: Restrict posts read access to authenticated users only
-- This changes the policy from allowing public access (true) to requiring authentication

DROP POLICY IF EXISTS "Allow read access to posts" ON public.posts;

CREATE POLICY "Authenticated users can read posts" 
ON public.posts 
FOR SELECT 
TO authenticated
USING (auth.uid() IS NOT NULL);