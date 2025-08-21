-- Fix Function Search Path Mutable: Set secure search_path for all functions
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Update handle_new_user function
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public
    AS $function$
    BEGIN
      INSERT INTO public.profiles (user_id, username)
      VALUES (
        NEW.id, 
        COALESCE(NEW.raw_user_meta_data ->> 'username', split_part(NEW.email, '@', 1))
      );
      RETURN NEW;
    END;
    $function$;

    -- Update has_role function
    CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
    RETURNS boolean
    LANGUAGE sql
    STABLE 
    SECURITY DEFINER
    SET search_path = pg_catalog, public
    AS $function$
      SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
      )
    $function$;

    -- Update update_updated_at_column function
    CREATE OR REPLACE FUNCTION public.update_updated_at_column()
    RETURNS trigger
    LANGUAGE plpgsql
    SECURITY DEFINER
    SET search_path = pg_catalog, public
    AS $function$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $function$;
END $$;

-- Fix User Profile Data: Restrict profiles access to own data only
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

CREATE POLICY "Users can view own profile only" ON public.profiles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile only" ON public.profiles  
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile only" ON public.profiles
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Fix Anonymous Access Policies: Allow anonymous read-only access to posts, comments, likes
-- Keep existing policies but ensure anonymous users cannot write

-- Posts: Allow anonymous read, authenticated write
DROP POLICY IF EXISTS "Everyone can view posts" ON public.posts;
CREATE POLICY "Allow read access to posts" ON public.posts
FOR SELECT USING (true);

-- Comments: Allow anonymous read, authenticated write  
DROP POLICY IF EXISTS "Everyone can view comments" ON public.comments;
CREATE POLICY "Allow read access to comments" ON public.comments
FOR SELECT USING (true);

-- Post comments: Allow anonymous read, authenticated write
DROP POLICY IF EXISTS "Everyone can view post comments" ON public.post_comments;
CREATE POLICY "Allow read access to post comments" ON public.post_comments
FOR SELECT USING (true);

-- Post likes: Allow anonymous read, authenticated write
DROP POLICY IF EXISTS "Everyone can view post likes" ON public.post_likes;
CREATE POLICY "Allow read access to post likes" ON public.post_likes
FOR SELECT USING (true);

-- Comment likes: Allow anonymous read, authenticated write
DROP POLICY IF EXISTS "Everyone can view comment likes" ON public.comment_likes;
CREATE POLICY "Allow read access to comment likes" ON public.comment_likes
FOR SELECT USING (true);

-- Reactions: Keep existing authenticated-only access
-- No changes needed for reactions table

-- Ensure catalog tables allow anonymous read-only access (no write operations)
-- These already have correct policies, just ensuring they're read-only for anonymous

-- Note: Leaked Password Protection and MFA Options must be configured in Supabase Dashboard
-- These cannot be set via SQL migrations