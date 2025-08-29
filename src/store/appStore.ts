import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from '@/integrations/supabase/client';
import type { Post, Comment } from '@/hooks/usePosts';

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
}

interface PostsState {
  posts: Post[];
  profiles: Record<string, Profile>;
  postLikes: Record<string, number>;
  userLikes: Record<string, string>;
  comments: Record<string, Comment[]>;
  loading: boolean;
  lastFetch: number;
  error: string | null;
}

interface PostsActions {
  fetchAllData: (userId?: string) => Promise<void>;
  refreshData: (userId?: string) => Promise<void>;
  addPost: (post: Post) => void;
  updatePost: (postId: string, updates: Partial<Post>) => void;
  deletePost: (postId: string) => void;
  updateLikes: (postId: string, likes: number, userLike?: string) => void;
  addComment: (comment: Comment) => void;
  setLoading: (loading: boolean) => void;
  clearError: () => void;
}

export const useAppStore = create<PostsState & PostsActions>()(
  persist(
    (set, get) => ({
      // State
      posts: [],
      profiles: {},
      postLikes: {},
      userLikes: {},
      comments: {},
      loading: false,
      lastFetch: 0,
      error: null,

      // Actions
      fetchAllData: async (userId?: string) => {
        const state = get();
        const now = Date.now();
        
        // Only fetch if data is older than 5 minutes or empty
        if (state.posts.length > 0 && now - state.lastFetch < 5 * 60 * 1000) {
          return;
        }

        set({ loading: true, error: null });

        try {
          // Fetch posts
          const { data: postsData, error: postsError } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false });

          if (postsError) throw postsError;

          // Fetch profiles
          const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
          const { data: profilesData, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .in('id', userIds);

          if (profilesError) throw profilesError;

          // Create profiles map
          const profilesMap: Record<string, Profile> = {};
          profilesData?.forEach(profile => {
            profilesMap[profile.id] = profile;
          });

          // Map profiles to posts
          const postsWithProfiles = postsData?.map(post => ({
            ...post,
            profiles: profilesMap[post.user_id]
          })) || [];

          // Fetch likes
          const postIds = postsWithProfiles.map(p => p.id);
          const { data: likesData, error: likesError } = await supabase
            .from('post_likes')
            .select('post_id, like_type, user_id')
            .in('post_id', postIds);

          if (likesError) throw likesError;

          const likeCounts: Record<string, number> = {};
          const userLikeTypes: Record<string, string> = {};
          
          likesData?.forEach(like => {
            if (like.like_type === 'like') {
              likeCounts[like.post_id] = (likeCounts[like.post_id] || 0) + 1;
            }
            if (like.user_id === userId) {
              userLikeTypes[like.post_id] = like.like_type;
            }
          });

          // Fetch comments
          const { data: commentsData, error: commentsError } = await supabase
            .from('post_comments')
            .select('*, profiles(username, avatar_url)')
            .in('post_id', postIds)
            .order('created_at', { ascending: true });

          if (commentsError) throw commentsError;

          const commentsByPost: Record<string, Comment[]> = {};
          commentsData?.forEach(comment => {
            if (!commentsByPost[comment.post_id]) {
              commentsByPost[comment.post_id] = [];
            }
            commentsByPost[comment.post_id].push({
              ...comment,
              profiles: comment.profiles || { username: 'Anonymous', avatar_url: null }
            } as Comment);
          });

          set({
            posts: postsWithProfiles,
            profiles: profilesMap,
            postLikes: likeCounts,
            userLikes: userLikeTypes,
            comments: commentsByPost,
            loading: false,
            lastFetch: now,
            error: null
          });

        } catch (error: any) {
          console.error('Error fetching data:', error);
          set({ 
            loading: false, 
            error: error.message || 'Failed to fetch data' 
          });
        }
      },

      refreshData: async (userId?: string) => {
        set({ lastFetch: 0 }); // Force refresh
        await get().fetchAllData(userId);
      },

      addPost: (post: Post) => {
        set(state => ({
          posts: [post, ...state.posts]
        }));
      },

      updatePost: (postId: string, updates: Partial<Post>) => {
        set(state => ({
          posts: state.posts.map(post => 
            post.id === postId ? { ...post, ...updates } : post
          )
        }));
      },

      deletePost: (postId: string) => {
        set(state => ({
          posts: state.posts.filter(post => post.id !== postId),
          comments: Object.fromEntries(
            Object.entries(state.comments).filter(([id]) => id !== postId)
          )
        }));
      },

      updateLikes: (postId: string, likes: number, userLike?: string) => {
        set(state => ({
          postLikes: { ...state.postLikes, [postId]: likes },
          userLikes: userLike 
            ? { ...state.userLikes, [postId]: userLike }
            : Object.fromEntries(
                Object.entries(state.userLikes).filter(([id]) => id !== postId)
              )
        }));
      },

      addComment: (comment: Comment) => {
        set(state => ({
          comments: {
            ...state.comments,
            [comment.post_id]: [
              ...(state.comments[comment.post_id] || []),
              comment
            ]
          }
        }));
      },

      setLoading: (loading: boolean) => set({ loading }),
      clearError: () => set({ error: null })
    }),
    {
      name: 'app-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        posts: state.posts,
        profiles: state.profiles,
        postLikes: state.postLikes,
        userLikes: state.userLikes,
        comments: state.comments,
        lastFetch: state.lastFetch
      })
    }
  )
);