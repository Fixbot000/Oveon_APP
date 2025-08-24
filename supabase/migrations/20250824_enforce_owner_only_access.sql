-- Drop existing RLS policies for profiles
DROP POLICY IF EXISTS "Authenticated users can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Add new RLS policy for profiles to enforce owner-only access
CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT USING (auth.uid() = id);

-- Drop existing RLS policies for posts
DROP POLICY IF EXISTS "Anyone can view posts" ON public.posts;
DROP POLICY IF EXISTS "Allow read access to posts" ON public.posts;

-- Add new RLS policy for posts to enforce owner-only access
CREATE POLICY "Users can view own posts only" ON public.posts
FOR SELECT USING (auth.uid() = user_id);
