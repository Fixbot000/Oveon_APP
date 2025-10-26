import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Heart, MessageCircle, Eye, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import BottomNavigation from '@/components/BottomNavigation';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { OptimizedImage } from '@/components/OptimizedImage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Post {
  id: string;
  user_id: string;
  text: string;
  image_url: string | null;
  created_at: string;
  likes: number;
  dislikes: number;
  views: number;
  profiles?: {
    username: string;
    avatar_url: string | null;
    ispremium: boolean;
  };
  user_like?: 'like' | null;
  user_has_liked?: boolean; // New property
}

type SortOption = 'newest' | 'most_liked';

interface CommunityProps {
  isScrolled: boolean;
}

const Community = ({ isScrolled }: CommunityProps) => {
  const [newPostText, setNewPostText] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, isPremium } = useAuth();
  const navigate = useNavigate();
  const [postFilter, setPostFilter] = useState<'all' | 'my' | 'liked'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<Partial<Profile> | null>(null);
  const [isUserDetailsModalOpen, setIsUserDetailsModalOpen] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch posts with profiles
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles (
            username,
            avatar_url,
            ispremium
          )
        `);
      
      if (postFilter === 'my' && user) {
        query = query.eq('user_id', user.id);
      } else if (postFilter === 'all') {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        query = query.gte('created_at', thirtyDaysAgo.toISOString());
      } else if (postFilter === 'liked' && user) {
        // This part needs to be handled on the frontend after fetching all posts and user likes
        // The `post_likes` table doesn't have profiles directly, so we need to join.
        // For simplicity, we'll fetch all posts and then filter in the frontend based on `userLikes`
        // This approach might not be scalable for very large number of posts
        // An alternative would be to use a database function or view for liked posts
      }

      if (sortBy === 'newest') {
        query = query.order('created_at', { ascending: false });
      } else if (sortBy === 'most_liked') {
        query = query.order('likes', { ascending: false });
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) throw postsError;

      // If user is logged in, get their likes
      let userLikes: any[] = [];
      if (user) {
        const { data: likesData, error: likesError } = await supabase
          .from('post_likes')
          .select('post_id, like_type')
          .eq('user_id', user.id);
        
        if (likesError) throw likesError;
        userLikes = likesData || [];
      }

      // Combine posts with user likes
      const postsWithLikes = postsData?.map(post => ({
        ...post,
        user_like: userLikes.find(like => like.post_id === post.id)?.like_type || null,
        user_has_liked: userLikes.some(like => like.post_id === post.id && like.like_type === 'like') // Populate new field
      })) || [];

      if (postFilter === 'liked') {
        setPosts(postsWithLikes.filter(post => post.user_has_liked));
      } else {
        setPosts(postsWithLikes);
      }
    } catch (error: any) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  }, [postFilter, user, sortBy]);

  const createPost = async () => {
    if (!user) {
      return;
    }

    if (!newPostText.trim()) {
      return;
    }

    try {
      setIsPosting(true);
      const { error } = await supabase
        .from('posts')
        .insert({
          user_id: user.id,
          text: newPostText.trim()
        });

      if (error) throw error;

      setNewPostText('');
      fetchPosts();
    } catch (error: any) {
      console.error('Error creating post:', error);
    } finally {
      setIsPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      return;
    }

    try {
      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;

      // Check if user already has a like on this post
      const { data: existingLike } = await supabase
        .from('post_likes')
        .select('like_type')
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .eq('like_type', 'like')
        .maybeSingle();

      let likeDelta = 0;
      let newUserLike: 'like' | null = null;
      let newLikeCount = currentPost.likes;

      if (existingLike) {
        // Remove like (toggle off)
        await supabase
          .from('post_likes')
          .delete()
          .eq('user_id', user.id)
          .eq('post_id', postId);
        
        likeDelta = -1;
        newUserLike = null;
        newLikeCount = Math.max(0, currentPost.likes - 1); // Ensure never goes below 0
      } else {
        // Add new like
        await supabase
          .from('post_likes')
          .insert({
            user_id: user.id,
            post_id: postId,
            like_type: 'like'
          });
        
        likeDelta = 1;
        newUserLike = 'like';
        newLikeCount = currentPost.likes + 1;
      }

      // Update post count in database
      await supabase
        .from('posts')
        .update({
          likes: newLikeCount
        })
        .eq('id', postId);

      // Update local state immediately for better UX
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { 
                ...post, 
                likes: newLikeCount,
                user_like: newUserLike
              }
            : post
        )
      );

    } catch (error: any) {
      console.error('Error handling like:', error);
      // Refresh data on error
      fetchPosts();
    }
  };

  const incrementViews = async (postId: string) => {
    try {
      const currentPost = posts.find(p => p.id === postId);
      if (!currentPost) return;

      // Update UI optimistically
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === postId 
            ? { ...post, views: post.views + 1 }
            : post
        )
      );

      // Update database
      await supabase
        .from('posts')
        .update({ views: currentPost.views + 1 })
        .eq('id', postId);
    } catch (error) {
      console.error('Error incrementing views:', error);
      // Revert optimistic update on error
      fetchPosts();
    }
  };

  const handleDeletePost = async () => {
    if (!user || !postToDelete) {
      return;
    }

    try {
      // First, delete associated likes
      await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postToDelete);

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postToDelete)
        .eq('user_id', user.id); // Ensure only the owner can delete

      if (error) throw error;

      setPosts(prevPosts => prevPosts.filter(post => post.id !== postToDelete));
      setShowDeleteConfirm(false); // Close the dialog
      setPostToDelete(null); // Clear the post to delete
    } catch (error: any) {
      console.error('Error deleting post:', error);
    }
  };

  const openDiscussion = (postId: string) => {
    incrementViews(postId);
    navigate(`/discussion/${postId}`);
  };

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts, sortBy]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="px-4 py-6">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Card key={i} className="max-w-2xl mx-auto">
                <CardContent className="p-6">
                  <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-20 bg-muted rounded"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      
      <main className="px-4 py-6 space-y-6">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Community</h1>
        </div>

        {/* Post Filter Tabs */}
        <Tabs value={postFilter} onValueChange={(value: 'all' | 'my' | 'liked') => setPostFilter(value)} className="max-w-2xl mx-auto mb-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all" onClick={() => setPostFilter('all')}>All Posts</TabsTrigger>
            <TabsTrigger value="my" onClick={() => setPostFilter('my')} disabled={!user}>My Posts</TabsTrigger>
            <TabsTrigger value="liked" onClick={() => setPostFilter('liked')} disabled={!user}>Liked Posts</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Sorting Options */}
        <div className="max-w-2xl mx-auto mb-6 flex justify-end">
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="most_liked">Most Liked</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Create Post */}
        {user && (
          <Card className="max-w-2xl mx-auto">
            <CardHeader>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Share with the community
              </h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="What's on your mind? Share your repair tips, ask questions, or discuss electronics..."
                value={newPostText}
                onChange={(e) => setNewPostText(e.target.value)}
                className="min-h-[120px] w-full resize-none"
              />
              <Button 
                onClick={createPost} 
                className="w-full"
                disabled={!newPostText.trim() || isPosting}
              >
                <Send className="h-4 w-4 mr-2" />
                Share Post
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Posts List */}
        <div className="space-y-6 max-w-2xl mx-auto">
          {posts.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No posts yet</h3>
                <p className="text-muted-foreground">Be the first to share something with the community!</p>
              </CardContent>
            </Card>
          ) : (
            posts.map((post) => (
              <Card key={post.id} className="shadow-lg hover:shadow-xl transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Avatar 
                      className={`h-10 w-10 cursor-pointer ${post.profiles?.ispremium ? 'ring-2 ring-amber-400' : ''}`}
                      onClick={() => {
                        if (post.profiles) {
                          setSelectedUser({ avatar_url: post.profiles.avatar_url, username: post.profiles.username, ispremium: post.profiles.ispremium });
                          setIsUserDetailsModalOpen(true);
                        }
                      }}
                    >
                      {post.profiles?.avatar_url && (
                        <OptimizedImage 
                          src={post.profiles.avatar_url} 
                          alt="User avatar"
                          className="w-full h-full object-cover rounded-full"
                        />
                      )}
                      <AvatarFallback className="text-sm">
                        {post.profiles?.username?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">
                        {post.profiles?.username || 'Anonymous User'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(post.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>

                  <div className="text-left mb-4">
                    <p className="text-foreground leading-relaxed">
                      {post.text}
                    </p>
                  </div>

                  {post.image_url && (
                    <div className="mb-4">
                      <OptimizedImage 
                        src={post.image_url} 
                        alt="Post image"
                        className="w-full rounded-lg object-cover max-h-96"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleLike(post.id)}
                        className={`flex items-center space-x-1 transition-colors ${
                          post.user_like === 'like' ? 'text-red-500 hover:text-red-600' : 'text-muted-foreground hover:text-red-500'
                        }`}
                      >
                        <Heart className={`h-4 w-4 ${post.user_like === 'like' ? 'fill-current' : ''}`} />
                        
                      </Button>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <Eye className="h-4 w-4" />
                        <span>{post.views}</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user && user.id === post.user_id && (
                        <AlertDialog open={showDeleteConfirm && postToDelete === post.id} onOpenChange={setShowDeleteConfirm}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation(); // Prevent opening discussion
                              setPostToDelete(post.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="flex items-center space-x-1 text-muted-foreground hover:text-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>Delete</span>
                          </Button>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you sure you want to delete this message?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your message and remove it from the community.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel onClick={() => setShowDeleteConfirm(false)}>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeletePost}>Confirm</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openDiscussion(post.id)}
                        className="flex items-center space-x-1"
                      >
                        <MessageCircle className="h-4 w-4" />
                        <span>Talk</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {selectedUser && (
          <Dialog open={isUserDetailsModalOpen} onOpenChange={setIsUserDetailsModalOpen}>
            <DialogContent className="sm:max-w-[320px]">
              <DialogHeader>
                <DialogTitle className="text-center">User Details</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                <Avatar className={`h-24 w-24 ${selectedUser.ispremium ? 'ring-2 ring-amber-400' : ''}`}>
                  {selectedUser.avatar_url && (
                    <OptimizedImage src={selectedUser.avatar_url} alt="User avatar" className="w-full h-full object-cover rounded-full" />
                  )}
                  <AvatarFallback className="text-3xl">
                    {(selectedUser.username?.[0] || 'U').toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h3 className="text-xl font-semibold">{selectedUser.username}</h3>
              </div>
            </DialogContent>
          </Dialog>
        )}

        <BottomNavigation />
      </main>
    </div>
  );
};

export default Community;