import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export interface Post {
  id: string;
  content: string;
  image_urls: string[] | null;
  image_url?: string | null;
  created_at: string;
  user_id: string;
  profiles?: {
    username: string;
    avatar_url?: string;
    ispremium?: boolean; // Add isPremium to profile
  };
}

export interface PostLike {
  post_id: string;
  user_id: string;
  like_type: 'like' | 'dislike';
}

export interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url: string | null;
  };
  parent_comment_id?: string | null;
}

// Fetch posts with profiles
export const usePosts = (showMyPosts = false) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['posts', showMyPosts, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (showMyPosts && user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { data: postsData, error } = await query;
      if (error) throw error;

      // Get user profiles
      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, ispremium') // Select ispremium
        .in('id', userIds);

      return postsData?.map(post => ({
        ...post,
        profiles: profilesData?.find(p => p.id === post.user_id)
      })) || [];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

// Fetch post likes with real-time updates
export const usePostLikes = (postIds: string[]) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ['post-likes', postIds],
    queryFn: async () => {
      if (postIds.length === 0) return { likes: {}, userLikes: {} };

      const { data: likesData } = await supabase
        .from('post_likes')
        .select('post_id, like_type, user_id')
        .in('post_id', postIds);

      const likes: Record<string, number> = {};
      const userLikes: Record<string, string> = {};
      
      likesData?.forEach(like => {
        if (like.like_type === 'like') {
          likes[like.post_id] = (likes[like.post_id] || 0) + 1;
        }
        if (like.user_id === user?.id) {
          userLikes[like.post_id] = like.like_type;
        }
      });

      return { likes, userLikes };
    },
    enabled: postIds.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
};

// Like/unlike mutation with optimistic updates
export const useLikePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ postId, likeType }: { postId: string; likeType: 'like' | 'dislike' }) => {
      if (!user) throw new Error('User not authenticated');

      // Check existing like
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('like_type')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (existingLike) {
        // Remove existing like
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      }

      if (!existingLike || existingLike.like_type !== likeType) {
        // Add new like
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
            like_type: likeType
          });
      }

      return { postId, likeType, existingLike };
    },
    onMutate: async ({ postId, likeType }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['post-likes'] });

      // Snapshot previous value
      const previousLikes = queryClient.getQueryData(['post-likes', [postId]]);

      // Optimistically update
      queryClient.setQueryData(['post-likes', [postId]], (old: any) => {
        if (!old) return old;
        
        const { likes, userLikes } = old;
        const currentUserLike = userLikes[postId];
        
        const newLikes = { ...likes };
        const newUserLikes = { ...userLikes };

        // Remove previous like count
        if (currentUserLike === 'like') {
          newLikes[postId] = Math.max(0, (newLikes[postId] || 0) - 1);
        }

        // Add new like if different or toggle off
        if (currentUserLike !== likeType) {
          if (likeType === 'like') {
            newLikes[postId] = (newLikes[postId] || 0) + 1;
          }
          newUserLikes[postId] = likeType;
        } else {
          // Toggle off - remove user like
          delete newUserLikes[postId];
        }

        return { likes: newLikes, userLikes: newUserLikes };
      });

      return { previousLikes };
    },
    onError: (err, variables, context) => {
      // Rollback optimistic update
      if (context?.previousLikes) {
        queryClient.setQueryData(['post-likes', [variables.postId]], context.previousLikes);
      }
      toast.error('Failed to update like');
    },
    onSettled: (data) => {
      // Refetch to sync with server
      if (data) {
        queryClient.invalidateQueries({ queryKey: ['post-likes'] });
      }
    },
  });
};

// Fetch comments for a post
export const usePostComments = (postId: string) => {
  return useQuery({
    queryKey: ['comments', postId],
    queryFn: async () => {
      const { data: commentsData, error } = await supabase
        .from('post_comments')
        .select('*, profiles(username, avatar_url)')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      return commentsData?.map(comment => ({
        ...comment,
        profiles: comment.profiles || { username: 'Anonymous', avatar_url: null }
      })) as Comment[] || [];
    },
    enabled: !!postId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

// Create post mutation
export const useCreatePost = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, imageUrls }: { content: string; imageUrls: string[] }) => {
      if (!user) throw new Error('User not authenticated');

      const insertData: any = {
        content,
        user_id: user.id,
      };
      if (imageUrls.length > 0) {
        insertData.image_urls = imageUrls;
      }

      const { error } = await supabase
        .from('posts')
        .insert(insertData);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      toast.success('Post created successfully!');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create post');
    },
  });
};

// Prefetch post details
export const usePrefetchPost = () => {
  const queryClient = useQueryClient();

  return (postId: string) => {
    queryClient.prefetchQuery({
      queryKey: ['comments', postId],
      queryFn: async () => {
        const { data: commentsData, error } = await supabase
          .from('post_comments')
          .select('*, profiles(username, avatar_url)')
          .eq('post_id', postId)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return commentsData || [];
      },
      staleTime: 2 * 60 * 1000,
    });
  };
};