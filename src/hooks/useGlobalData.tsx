import { useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Hook to manage global data loading and real-time updates
export const useGlobalData = () => {
  const { user } = useAuth();
  const {
    posts,
    profiles,
    postLikes,
    userLikes,
    comments,
    loading,
    error,
    fetchAllData,
    refreshData,
    updateLikes,
    addComment,
    addPost,
    updatePost,
    deletePost,
    clearError
  } = useAppStore();

  // Fetch data on mount or user change
  useEffect(() => {
    if (user) {
      fetchAllData(user.id);
    }
  }, [user?.id, fetchAllData]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to post changes
    const postsChannel = supabase
      .channel('posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts'
        },
        async (payload) => {
          const newPost = payload.new as any;
          // Fetch the profile for the new post using foreign key relationship
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, email')
            .eq('id', newPost.user_id)
            .single();
          
          addPost({
            ...newPost,
            profiles: profile ? { username: profile.username, avatar_url: profile.avatar_url } : { username: 'Anonymous', avatar_url: null }
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          const updatedPost = payload.new as any;
          updatePost(updatedPost.id, updatedPost);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts'
        },
        (payload) => {
          const deletedPost = payload.old as any;
          deletePost(deletedPost.id);
        }
      )
      .subscribe();

    // Subscribe to likes changes
    const likesChannel = supabase
      .channel('likes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes'
        },
        async (payload) => {
          const postId = (payload.new as any)?.post_id || (payload.old as any)?.post_id;
          if (!postId) return;

          // Refetch likes for this post
          const { data: likesData } = await supabase
            .from('post_likes')
            .select('like_type, user_id')
            .eq('post_id', postId);

          const likeCount = likesData?.filter(l => l.like_type === 'like').length || 0;
          const userLike = likesData?.find(l => l.user_id === user.id)?.like_type;

          updateLikes(postId, likeCount, userLike);
        }
      )
      .subscribe();

    // Subscribe to comments changes
    const commentsChannel = supabase
      .channel('comments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'post_comments'
        },
        async (payload) => {
          const newComment = payload.new as any;
          // Fetch the profile for the new comment using foreign key relationship
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, email')
            .eq('id', newComment.user_id)
            .single();
          
          addComment({
            ...newComment,
            profiles: profile ? { username: profile.username, avatar_url: profile.avatar_url } : { username: 'Anonymous', avatar_url: null }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
      supabase.removeChannel(likesChannel);
      supabase.removeChannel(commentsChannel);
    };
  }, [user?.id, addPost, updatePost, deletePost, updateLikes, addComment]);

  // Handle like/unlike with optimistic updates
  const handleLike = async (postId: string, likeType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Please sign in to like posts');
      return;
    }

    const currentLike = userLikes[postId];
    const currentLikeCount = postLikes[postId] || 0;

    // Optimistic update
    let newLikeCount = currentLikeCount;
    let newUserLike: string | undefined = undefined;

    if (currentLike === 'like') {
      newLikeCount -= 1;
    }

    if (currentLike !== likeType) {
      if (likeType === 'like') {
        newLikeCount += 1;
      }
      newUserLike = likeType;
    }

    updateLikes(postId, newLikeCount, newUserLike);

    try {
      // Remove existing like
      if (currentLike) {
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      }

      // Add new like if different
      if (currentLike !== likeType) {
        await supabase
          .from('post_likes')
          .insert({
            post_id: postId,
            user_id: user.id,
            like_type: likeType
          });
      }
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert optimistic update
      updateLikes(postId, currentLikeCount, currentLike);
      toast.error('Failed to update like');
    }
  };

  // Handle create post
  const handleCreatePost = async (content: string, imageUrls: string[]) => {
    if (!user) {
      toast.error('Please sign in to create a post');
      return false;
    }

    try {
      const insertData: any = {
        content,
        user_id: user.id,
      };
      if (imageUrls.length > 0) {
        insertData.image_urls = imageUrls;
      }

      const { data, error } = await supabase
        .from('posts')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;

      toast.success('Post created successfully!');
      return true;
    } catch (error: any) {
      console.error('Error creating post:', error);
      toast.error(error?.message || 'Failed to create post');
      return false;
    }
  };

  // Handle add comment
  const handleAddComment = async (postId: string, content: string) => {
    if (!user) {
      toast.error('Please sign in to comment');
      return false;
    }

    try {
      await supabase
        .from('post_comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content
        });

      toast.success('Comment added!');
      return true;
    } catch (error: any) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
      return false;
    }
  };

  return {
    // Data
    posts,
    profiles,
    postLikes,
    userLikes,
    comments,
    loading,
    error,
    
    // Actions
    refreshData: () => refreshData(user?.id),
    handleLike,
    handleCreatePost,
    handleAddComment,
    clearError
  };
};