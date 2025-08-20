-- Fix the remaining issues by correcting the policies that still show anonymous access warnings
-- The warnings are because auth.role() = 'authenticated' allows anonymous access when anonymous users have 'anon' role

-- Update all policies to use auth.uid() IS NOT NULL for proper authentication checking
-- This ensures only authenticated users (with valid JWT tokens) can access data

-- Update boards policies
DROP POLICY IF EXISTS "Authenticated users can read boards" ON public.boards;
CREATE POLICY "Authenticated users can read boards"
ON public.boards
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update components policies  
DROP POLICY IF EXISTS "Authenticated users can read components" ON public.components;
CREATE POLICY "Authenticated users can read components"
ON public.components
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update devices policies
DROP POLICY IF EXISTS "Authenticated users can read devices" ON public.devices;
CREATE POLICY "Authenticated users can read devices"
ON public.devices
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update instruments policies
DROP POLICY IF EXISTS "Authenticated users can read instruments" ON public.instruments;
CREATE POLICY "Authenticated users can read instruments"
ON public.instruments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update pcbs policies
DROP POLICY IF EXISTS "Authenticated users can read pcbs" ON public.pcbs;
CREATE POLICY "Authenticated users can read pcbs"
ON public.pcbs
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update comment_likes policies
DROP POLICY IF EXISTS "Authenticated users can view comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
ON public.comment_likes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update post_likes policies
DROP POLICY IF EXISTS "Authenticated users can view post likes" ON public.post_likes;
CREATE POLICY "Authenticated users can view post likes"
ON public.post_likes
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update comments policies
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update post_comments policies
DROP POLICY IF EXISTS "Authenticated users can view post comments" ON public.post_comments;
CREATE POLICY "Authenticated users can view post comments"
ON public.post_comments
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update posts policies
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;
CREATE POLICY "Authenticated users can view posts"
ON public.posts
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Update reactions policies
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.reactions;
CREATE POLICY "Authenticated users can view reactions"
ON public.reactions
FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Remove the security definer view that was flagged
DROP VIEW IF EXISTS public.post_with_stats;