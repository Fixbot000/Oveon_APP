-- Enable RLS on all public tables that currently have it disabled
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pcbs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on diagnostic_sessions table (currently has no policies but should have RLS)
ALTER TABLE public.diagnostic_sessions ENABLE ROW LEVEL SECURITY;

-- Add proper RLS policies for diagnostic_sessions
CREATE POLICY "Users can manage their own diagnostic sessions"
ON public.diagnostic_sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Remove anonymous access policies and replace with authenticated-only policies

-- Update boards policies (remove anonymous access)
DROP POLICY IF EXISTS "Allow public read access to boards" ON public.boards;
CREATE POLICY "Authenticated users can read boards"
ON public.boards
FOR SELECT
USING (auth.role() = 'authenticated');

-- Update components policies (remove anonymous access)  
DROP POLICY IF EXISTS "Allow public read access to components" ON public.components;
CREATE POLICY "Authenticated users can read components"
ON public.components
FOR SELECT
USING (auth.role() = 'authenticated');

-- Update devices policies (remove anonymous access)
DROP POLICY IF EXISTS "Allow public read access to devices" ON public.devices;
CREATE POLICY "Authenticated users can read devices"
ON public.devices
FOR SELECT
USING (auth.role() = 'authenticated');

-- Update instruments policies (remove anonymous access)
DROP POLICY IF EXISTS "Allow public read access to instruments" ON public.instruments;
CREATE POLICY "Authenticated users can read instruments"
ON public.instruments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Update pcbs policies (remove anonymous access)
DROP POLICY IF EXISTS "Allow public read access to pcbs" ON public.pcbs;
CREATE POLICY "Authenticated users can read pcbs"
ON public.pcbs
FOR SELECT
USING (auth.role() = 'authenticated');

-- Remove anonymous access from comment_likes and post_likes
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can view comment likes"
ON public.comment_likes
FOR SELECT
USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Anyone can view post likes" ON public.post_likes;
CREATE POLICY "Authenticated users can view post likes"
ON public.post_likes
FOR SELECT
USING (auth.role() = 'authenticated');

-- Remove anonymous access from comments viewing
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
CREATE POLICY "Authenticated users can view comments"
ON public.comments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Remove anonymous access from post_comments viewing
DROP POLICY IF EXISTS "Anyone can view post comments" ON public.post_comments;
CREATE POLICY "Authenticated users can view post comments"
ON public.post_comments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Remove anonymous access from posts viewing
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
CREATE POLICY "Authenticated users can view posts"
ON public.posts
FOR SELECT
USING (auth.role() = 'authenticated');

-- Remove anonymous access from reactions viewing
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.reactions;
CREATE POLICY "Authenticated users can view reactions"
ON public.reactions
FOR SELECT
USING (auth.role() = 'authenticated');

-- Remove the explicit anonymous blocking policies (redundant now)
DROP POLICY IF EXISTS "Anon cannot write comments" ON public.comments;
DROP POLICY IF EXISTS "Anon cannot write posts" ON public.posts;
DROP POLICY IF EXISTS "Anon cannot write reactions" ON public.reactions;
DROP POLICY IF EXISTS "Anon cannot insert history" ON public.history;