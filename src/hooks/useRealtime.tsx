import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

// Real-time updates for posts and likes
export const useRealtimePosts = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Subscribe to post changes
    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'posts'
        },
        () => {
          // Invalidate posts queries when any post changes
          queryClient.invalidateQueries({ queryKey: ['posts'] });
        }
      )
      .subscribe();

    // Subscribe to post_likes changes
    const likesChannel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes'
        },
        (payload) => {
          // Invalidate likes queries for the affected post
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.post_id || oldData?.post_id) {
            const postId = newData?.post_id || oldData?.post_id;
            queryClient.invalidateQueries({ 
              queryKey: ['post-likes'],
              predicate: (query) => {
                const queryKey = query.queryKey;
                return queryKey[1] && Array.isArray(queryKey[1]) && queryKey[1].includes(postId);
              }
            });
          }
        }
      )
      .subscribe();

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_comments'
        },
        (payload) => {
          // Invalidate comments for the affected post
          const newData = payload.new as any;
          const oldData = payload.old as any;
          if (newData?.post_id || oldData?.post_id) {
            const postId = newData?.post_id || oldData?.post_id;
            queryClient.invalidateQueries({ queryKey: ['comments', postId] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [queryClient]);
};