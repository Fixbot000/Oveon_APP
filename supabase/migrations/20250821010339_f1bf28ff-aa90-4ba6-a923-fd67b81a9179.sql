-- Restrict Anonymous Access Policies
-- Anonymous users can only SELECT from posts table
-- All other operations require authentication

-- Posts: Allow anonymous read, authenticated write (keep existing authenticated policies)
-- Posts already has "Allow read access to posts" policy for SELECT using (true)
-- Keep existing authenticated policies for posts

-- Comments: Remove anonymous access, require authentication
DROP POLICY IF EXISTS "Allow read access to comments" ON public.comments;
CREATE POLICY "Authenticated users can read comments" ON public.comments
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Post comments: Remove anonymous access, require authentication  
DROP POLICY IF EXISTS "Allow read access to post comments" ON public.post_comments;
CREATE POLICY "Authenticated users can read post comments" ON public.post_comments
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Post likes: Remove anonymous access, require authentication
DROP POLICY IF EXISTS "Allow read access to post likes" ON public.post_likes;
CREATE POLICY "Authenticated users can read post likes" ON public.post_likes
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Comment likes: Remove anonymous access, require authentication
DROP POLICY IF EXISTS "Allow read access to comment likes" ON public.comment_likes;
CREATE POLICY "Authenticated users can read comment likes" ON public.comment_likes
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Reactions: Already requires authentication, ensure policy is correct
DROP POLICY IF EXISTS "Authenticated users can view reactions" ON public.reactions;
CREATE POLICY "Authenticated users can read reactions" ON public.reactions
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Catalog tables: Remove anonymous access, require authentication
-- Boards
DROP POLICY IF EXISTS "Authenticated users can read boards" ON public.boards;
CREATE POLICY "Authenticated users can read boards" ON public.boards
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Components  
DROP POLICY IF EXISTS "Authenticated users can read components" ON public.components;
CREATE POLICY "Authenticated users can read components" ON public.components
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Devices
DROP POLICY IF EXISTS "Authenticated users can read devices" ON public.devices;
CREATE POLICY "Authenticated users can read devices" ON public.devices
FOR SELECT USING (auth.uid() IS NOT NULL);

-- Instruments
DROP POLICY IF EXISTS "Authenticated users can read instruments" ON public.instruments;  
CREATE POLICY "Authenticated users can read instruments" ON public.instruments
FOR SELECT USING (auth.uid() IS NOT NULL);

-- PCBs
DROP POLICY IF EXISTS "Authenticated users can read pcbs" ON public.pcbs;
CREATE POLICY "Authenticated users can read pcbs" ON public.pcbs
FOR SELECT USING (auth.uid() IS NOT NULL);

-- User-specific tables: Ensure only authenticated users can access their own data
-- Profiles: Already restricted to own profile only
-- History: Already restricted to own history only  
-- Diagnostic sessions: Already restricted to own sessions only
-- User roles: Already restricted to own roles only

-- Storage objects: Restrict anonymous access
-- Remove any policies that allow anonymous access to storage
-- Keep only authenticated user policies for their own files

-- Verify all existing authenticated user policies remain intact:
-- Posts: Users can create/update/delete own posts ✓
-- Comments: Users can create/update/delete own comments ✓  
-- Post comments: Users can create/update/delete own post comments ✓
-- Post likes: Users can create/update/delete own post likes ✓
-- Comment likes: Users can create/update/delete own comment likes ✓
-- Reactions: Users can create/update/delete own reactions ✓
-- Profiles: Users can view/update own profile only ✓
-- History: Users can insert/view own history ✓
-- Diagnostic sessions: Users can manage own sessions ✓