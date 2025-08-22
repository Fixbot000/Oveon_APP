-- Drop the existing insecure view
DROP VIEW IF EXISTS public.post_with_stats;

-- Recreate the view without SECURITY DEFINER
-- The view will use the security context of the querying user
-- This respects the RLS policies of the underlying tables (posts, likes, dislikes, comments)
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

-- Set security_barrier to ensure RLS is properly enforced
ALTER VIEW public.post_with_stats SET (security_barrier = true);

-- Grant appropriate permissions
GRANT SELECT ON public.post_with_stats TO authenticated;
GRANT SELECT ON public.post_with_stats TO anon;