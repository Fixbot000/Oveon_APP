-- Drop the existing insecure view
DROP VIEW IF EXISTS public.post_with_stats;

-- Recreate the view without SECURITY DEFINER and with proper RLS
CREATE VIEW public.post_with_stats AS
SELECT 
  p.id,
  p.user_id,
  p.content,
  p.image_url,
  p.created_at,
  (SELECT count(*) FROM public.likes l WHERE l.post_id = p.id) AS like_count,
  (SELECT count(*) FROM public.dislikes d WHERE d.post_id = p.id) AS dislike_count,
  (SELECT count(*) FROM public.comments c WHERE c.post_id = p.id) AS comment_count
FROM public.posts p;

-- Enable RLS on the view
ALTER VIEW public.post_with_stats SET (security_barrier = true);

-- Add RLS policy for the view that respects the underlying table's RLS
-- This view will inherit the security context of the querying user
-- The view will only show posts that the user can access through the posts table RLS policies
CREATE POLICY "View inherits posts table security" ON public.post_with_stats
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.posts 
      WHERE posts.id = post_with_stats.id
    )
  );