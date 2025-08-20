-- Fix anonymous access policies for social features
-- Anonymous users can read posts and related data, but cannot write anything
-- Authenticated users can create/update/delete their own content

-- Posts table: Allow anonymous reading, restrict writes to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;

-- Allow everyone (including anonymous) to read posts
CREATE POLICY "Everyone can view posts" ON public.posts
FOR SELECT USING (true);

-- Only authenticated users can create posts (and must own them)
CREATE POLICY "Authenticated users can create posts" ON public.posts
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can update their own posts
CREATE POLICY "Users can update own posts" ON public.posts
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can delete their own posts
CREATE POLICY "Users can delete own posts" ON public.posts
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Comments table: Allow anonymous reading, restrict writes to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;

-- Allow everyone (including anonymous) to read comments
CREATE POLICY "Everyone can view comments" ON public.comments
FOR SELECT USING (true);

-- Only authenticated users can create comments (and must own them)
CREATE POLICY "Authenticated users can create comments" ON public.comments
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can update their own comments
CREATE POLICY "Users can update own comments" ON public.comments
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can delete their own comments
CREATE POLICY "Users can delete own comments" ON public.comments
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Post likes table: Allow anonymous reading of like counts, restrict writes to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view post likes" ON public.post_likes;
DROP POLICY IF EXISTS "Users can manage their own post likes" ON public.post_likes;

-- Allow everyone to read post likes (needed for like counts)
CREATE POLICY "Everyone can view post likes" ON public.post_likes
FOR SELECT USING (true);

-- Only authenticated users can create their own likes
CREATE POLICY "Authenticated users can create post likes" ON public.post_likes
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can update their own likes
CREATE POLICY "Users can update own post likes" ON public.post_likes
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can delete their own likes
CREATE POLICY "Users can delete own post likes" ON public.post_likes
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Comment likes table: Allow anonymous reading of like counts, restrict writes to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can manage their own comment likes" ON public.comment_likes;

-- Allow everyone to read comment likes (needed for like counts)
CREATE POLICY "Everyone can view comment likes" ON public.comment_likes
FOR SELECT USING (true);

-- Only authenticated users can create their own likes
CREATE POLICY "Authenticated users can create comment likes" ON public.comment_likes
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can update their own likes
CREATE POLICY "Users can update own comment likes" ON public.comment_likes
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can delete their own likes
CREATE POLICY "Users can delete own comment likes" ON public.comment_likes
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Post comments table: Allow anonymous reading, restrict writes to authenticated users
DROP POLICY IF EXISTS "Authenticated users can view post comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can create their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.post_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.post_comments;

-- Allow everyone to read post comments
CREATE POLICY "Everyone can view post comments" ON public.post_comments
FOR SELECT USING (true);

-- Only authenticated users can create their own comments
CREATE POLICY "Authenticated users can create post comments" ON public.post_comments
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can update their own comments
CREATE POLICY "Users can update own post comments" ON public.post_comments
FOR UPDATE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Only users can delete their own comments
CREATE POLICY "Users can delete own post comments" ON public.post_comments
FOR DELETE USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);